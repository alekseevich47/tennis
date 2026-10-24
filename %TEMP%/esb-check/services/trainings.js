import pb from "./pb";
import { isModerator, getCurrentUser, BOT_BLOCKED_BOOKING_MESSAGE } from "./auth";
import { error } from "../lib/log";
import { hasTimeRangeEnded } from "../lib/format";
export const PENDING_DELETE_TRAININGS_KEY = "pending_delete_trainings";
export const SHOW_DELETED_TRAININGS_KEY = "trainings_show_deleted_moderator";
async function notifyTrainingBot(payload) {
  const actorId = getCurrentUser()?.id;
  if (!actorId) return;
  try {
    await pb.send("/api/bot-notify-training", {
      method: "POST",
      body: { ...payload, actorId }
    });
  } catch (err) {
    error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0431\u043E\u0442\u0430 \u043E \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0435:", err);
  }
}
function getUserId(user) {
  return String(
    /** @type {{ id?: unknown } | null | undefined} */
    user?.id || ""
  );
}
function toAuditUser(userId, user) {
  const record = (
    /** @type {UserAuditRecord | null | undefined} */
    user
  );
  return {
    id: userId,
    fullName: record?.fullName || record?.full_name || record?.email || "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C"
  };
}
function getExpandedUsers(training, relationKey) {
  const expand = (
    /** @type {Record<string, unknown> | undefined} */
    training.expand
  );
  const users = expand?.[relationKey];
  return Array.isArray(users) ? users : [];
}
async function resolveAuditUsers(userIds, knownUsers = []) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const usersById = new Map(knownUsers.map((user) => [getUserId(user), user]));
  const missingIds = ids.filter((id) => !usersById.has(id));
  const fetchedUsers = await Promise.all(
    missingIds.map(async (id) => {
      try {
        return await pb.collection("users").getOne(id, {
          fields: "id,full_name,email",
          requestKey: null
        });
      } catch (err) {
        error("resolve audit user:", err);
        return { id };
      }
    })
  );
  fetchedUsers.forEach((user) => {
    usersById.set(getUserId(user), user);
  });
  return ids.map((id) => toAuditUser(id, usersById.get(id)));
}
async function fetchMembershipSessionInfo(userId) {
  return (
    /** @type {{ available_sessions?: number | null, membership_type?: string }} */
    await pb.collection("users").getOne(userId, {
      fields: "available_sessions,membership_type",
      requestKey: null
    })
  );
}
function isUnlimitedMembership(membershipType) {
  return membershipType === "annual" || membershipType === "corporate";
}
async function hasAvailableMembershipSession(userId) {
  const user = await fetchMembershipSessionInfo(userId);
  if (isUnlimitedMembership(user.membership_type)) return true;
  if (user.membership_type === "one_time") return true;
  return (user.available_sessions || 0) > 0;
}
async function assertMembershipSessionAvailable(userId) {
  if (!await hasAvailableMembershipSession(userId)) {
    throw Object.assign(new Error("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0439"), { code: "NO_AVAILABLE_SESSIONS" });
  }
}
async function assertNotBotBlocked(userId) {
  const user = await pb.collection("users").getOne(userId, {
    fields: "bot_blocked",
    requestKey: null
  });
  if (user.bot_blocked === true) {
    throw Object.assign(new Error(BOT_BLOCKED_BOOKING_MESSAGE), { code: "BOT_BLOCKED" });
  }
}
function buildBookedUsersPatch(training, nextBookedUsers, addedUserIds) {
  const patch = { booked_users: nextBookedUsers };
  if (isModerator()) {
    const addedSet = new Set(addedUserIds);
    const kicked = training.moderator_kicked_users || [];
    const insufficient = training.restore_insufficient_users || [];
    const nextKicked = kicked.filter((id) => !addedSet.has(id));
    const nextInsufficient = insufficient.filter((id) => !addedSet.has(id));
    if (nextKicked.length !== kicked.length) patch.moderator_kicked_users = nextKicked;
    if (nextInsufficient.length !== insufficient.length) {
      patch.restore_insufficient_users = nextInsufficient;
    }
  }
  return patch;
}
const GMT7_OFFSET_MS = 7 * 60 * 60 * 1e3;
const DAY_MS = 24 * 60 * 60 * 1e3;
function dayBoundsGmt7(trainingDate) {
  const d = new Date(String(trainingDate).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  const shifted = d.getTime() + GMT7_OFFSET_MS;
  const dayStartUtcMs = Math.floor(shifted / DAY_MS) * DAY_MS - GMT7_OFFSET_MS;
  return { from: new Date(dayStartUtcMs), to: new Date(dayStartUtcMs + DAY_MS - 1) };
}
export async function findUsersOverDailyLimit(userIds, trainingDate, trainingId) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  const bounds = dayBoundsGmt7(trainingDate);
  if (!ids.length || !bounds) return [];
  const users = await pb.collection("users").getFullList({
    filter: ids.map((id) => pb.filter("id = {:id}", { id })).join(" || "),
    fields: "id,membership_type",
    requestKey: null
  });
  const limited = users.filter((u) => isUnlimitedMembership(u.membership_type)).map((u) => u.id);
  const over = [];
  for (const uid of limited) {
    const res = await pb.collection("trainings").getList(1, 1, {
      filter: pb.filter(
        "date >= {:from} && date <= {:to} && booked_users ?~ {:uid} && id != {:tid} && is_deleted != true",
        { from: bounds.from, to: bounds.to, uid, tid: trainingId }
      ),
      fields: "id",
      skipTotal: false,
      requestKey: null
    });
    if (res.totalItems > 0) over.push(uid);
  }
  return over;
}
function areTrainingValuesEqual(field, before, after) {
  if (field === "date") {
    const beforeTime = new Date(String(before || "")).getTime();
    const afterTime = new Date(String(after || "")).getTime();
    if (Number.isFinite(beforeTime) && Number.isFinite(afterTime)) return beforeTime === afterTime;
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    return JSON.stringify(before || []) === JSON.stringify(after || []);
  }
  return before === after;
}
function getTrainingChangedFields(previous, next, patch) {
  return Object.keys(patch).flatMap((field) => {
    const hasNextValue = Object.prototype.hasOwnProperty.call(next, field);
    const before = (
      /** @type {Record<string, unknown>} */
      previous[field]
    );
    const after = hasNextValue ? (
      /** @type {Record<string, unknown>} */
      next[field]
    ) : patch[field];
    if (areTrainingValuesEqual(field, before, after)) return [];
    return [{
      field,
      from: before ?? null,
      to: after ?? null
    }];
  });
}
export async function listTrainings({ signal } = {}) {
  try {
    return (
      /** @type {TrainingRecord[]} */
      await pb.collection("trainings").getFullList({
        sort: "date",
        filter: isModerator() ? "" : "is_deleted != true",
        expand: "booked_users,attended_users,unbooked_users,moderator_kicked_users,restore_insufficient_users",
        requestKey: null,
        signal
      })
    );
  } catch (err) {
    if (err && /** @type {Error} */
    err.name === "AbortError") return [];
    error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F:", err);
    throw err;
  }
}
export async function listCancelledTrainingsForUser(userId, { signal } = {}) {
  if (!userId) return [];
  try {
    return (
      /** @type {TrainingRecord[]} */
      await pb.collection("trainings").getFullList({
        sort: "-date",
        filter: pb.filter(
          "is_cancelled = true && (booked_users ~ {:uid} || unbooked_users ~ {:uid})",
          { uid: userId }
        ),
        fields: "id,date,duration,type",
        requestKey: null,
        signal
      })
    );
  } catch (err) {
    if (err && /** @type {Error} */
    err.name === "AbortError") return [];
    error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043E\u0442\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0445 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u043A:", err);
    throw err;
  }
}
export async function createTraining(payload) {
  const record = (
    /** @type {TrainingRecord} */
    await pb.collection("trainings").create(payload)
  );
  try {
    await pb.send("/api/bot-notify-training-create", {
      method: "POST",
      body: { trainingId: record.id }
    });
  } catch (err) {
    error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0431\u043E\u0442\u0430 \u043E \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0438 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438:", err);
  }
  return record;
}
export async function updateTraining(trainingId, patch) {
  try {
    const previous = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").getOne(trainingId, { requestKey: null })
    );
    const record = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(trainingId, patch)
    );
    const changedFields = getTrainingChangedFields(previous, record, patch);
    if (changedFields.length > 0) {
      const skipNotify = previous.is_cancelled === true || hasTimeRangeEnded(previous.date, previous.duration || 0);
      if (!skipNotify) {
        try {
          await pb.send("/api/bot-notify-training-edit", {
            method: "POST",
            body: { trainingId, changes: changedFields }
          });
        } catch (err) {
          error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0431\u043E\u0442\u0430 \u043E \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438:", err);
        }
      }
    }
    return record;
  } catch (err) {
    throw err;
  }
}
export async function finalizeCancelledTraining(trainingId) {
  try {
    const training = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").getOne(trainingId, {
        expand: "booked_users",
        requestKey: null
      })
    );
    const alreadyCancelled = training.is_cancelled === true;
    if (alreadyCancelled) {
      return training;
    }
    const ended = hasTimeRangeEnded(training.date, training.duration || 0);
    const record = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(trainingId, { is_cancelled: true })
    );
    if (!ended) {
      try {
        await pb.send("/api/bot-notify-training-cancelled", {
          method: "POST",
          body: { trainingId }
        });
      } catch (err) {
        error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0431\u043E\u0442\u0430 \u043E\u0431 \u043E\u0442\u043C\u0435\u043D\u0435 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438:", err);
      }
    }
    return record;
  } catch (err) {
    throw err;
  }
}
export function readPendingDeleteTrainingIds() {
  try {
    const raw = sessionStorage.getItem(PENDING_DELETE_TRAININGS_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return [];
    return Array.from(new Set(ids.filter((id) => typeof id === "string" && id)));
  } catch (err) {
    error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0441\u043F\u0430\u0440\u0441\u0438\u0442\u044C pending_delete_trainings:", err);
    return [];
  }
}
export function writePendingDeleteTrainingIds(ids) {
  const nextIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id)));
  if (nextIds.length > 0) {
    sessionStorage.setItem(PENDING_DELETE_TRAININGS_KEY, JSON.stringify(nextIds));
  } else {
    sessionStorage.removeItem(PENDING_DELETE_TRAININGS_KEY);
  }
  return nextIds;
}
export function addPendingDeleteTrainingId(trainingId) {
  return writePendingDeleteTrainingIds([...readPendingDeleteTrainingIds(), trainingId]);
}
export function removePendingDeleteTrainingId(trainingId) {
  return writePendingDeleteTrainingIds(
    readPendingDeleteTrainingIds().filter((id) => id !== trainingId)
  );
}
export function readShowDeletedTrainingsPreference() {
  try {
    const raw = localStorage.getItem(SHOW_DELETED_TRAININGS_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch (err) {
    error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C trainings_show_deleted_moderator:", err);
    return true;
  }
}
export function writeShowDeletedTrainingsPreference(value) {
  try {
    localStorage.setItem(SHOW_DELETED_TRAININGS_KEY, value ? "true" : "false");
  } catch (err) {
    error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C trainings_show_deleted_moderator:", err);
  }
  return value;
}
export async function softDeleteTraining(trainingId) {
  return (
    /** @type {TrainingRecord} */
    await pb.collection("trainings").update(trainingId, { is_deleted: true })
  );
}
async function notifyTrainingRestoredBot(trainingId) {
  try {
    await pb.send("/api/bot-notify-training-restored", {
      method: "POST",
      body: { trainingId }
    });
  } catch (err) {
    error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0431\u043E\u0442\u0430 \u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438:", err);
  }
}
export async function restoreTraining(trainingId) {
  try {
    const training = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").getOne(trainingId, {
        expand: "booked_users",
        requestKey: null
      })
    );
    let record;
    let insufficientUserIds = [];
    if (training.is_cancelled !== true) {
      record = /** @type {TrainingRecord} */
      await pb.collection("trainings").update(trainingId, { is_deleted: false });
      await notifyTrainingRestoredBot(trainingId);
      return { record, insufficientUsers: [] };
    }
    const ended = hasTimeRangeEnded(training.date, training.duration || 0);
    if (ended) {
      record = /** @type {TrainingRecord} */
      await pb.collection("trainings").update(trainingId, {
        is_cancelled: false,
        is_deleted: false
      });
    } else {
      const bookedUsers = training.booked_users || [];
      let nextUnbooked = [...training.unbooked_users || []];
      let nextAttended = [...training.attended_users || []];
      let nextKicked = [...training.moderator_kicked_users || []];
      const nextBooked = [];
      for (const userId of bookedUsers) {
        nextBooked.push(userId);
        nextKicked = nextKicked.filter((id) => id !== userId);
      }
      record = /** @type {TrainingRecord} */
      await pb.collection("trainings").update(trainingId, {
        booked_users: nextBooked,
        unbooked_users: nextUnbooked,
        attended_users: nextAttended,
        moderator_kicked_users: nextKicked,
        restore_insufficient_users: insufficientUserIds,
        is_cancelled: false,
        is_deleted: false
      });
    }
    await notifyTrainingRestoredBot(trainingId);
    const insufficientUsers = insufficientUserIds.length > 0 ? await resolveAuditUsers(insufficientUserIds, getExpandedUsers(training, "booked_users")) : [];
    return { record, insufficientUsers };
  } catch (err) {
    throw err;
  }
}
async function notifyTrainingStatusBot(trainingId, isClosed) {
  try {
    await pb.send("/api/bot-notify-training-status", {
      method: "POST",
      body: { trainingId, isClosed }
    });
  } catch (err) {
    error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0431\u043E\u0442\u0430 \u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0435 \u0437\u0430\u043F\u0438\u0441\u0438:", err);
  }
}
export async function closeTraining(trainingId) {
  const record = (
    /** @type {TrainingRecord} */
    await pb.collection("trainings").update(trainingId, { is_closed: true })
  );
  await notifyTrainingStatusBot(trainingId, true);
  return record;
}
export async function reopenTraining(trainingId) {
  const record = (
    /** @type {TrainingRecord} */
    await pb.collection("trainings").update(trainingId, { is_closed: false })
  );
  await notifyTrainingStatusBot(trainingId, false);
  return record;
}
export async function bookTraining(training, userId) {
  try {
    if (!userId) throw new Error("\u041D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D");
    await assertNotBotBlocked(userId);
    await assertMembershipSessionAvailable(userId);
    const current = training.booked_users || [];
    if (current.includes(userId)) throw new Error("\u0412\u044B \u0443\u0436\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B \u043D\u0430 \u044D\u0442\u0443 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443");
    if (training.max_slots && current.length >= training.max_slots) {
      throw new Error("\u041D\u0435\u0442 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u043C\u0435\u0441\u0442");
    }
    const record = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(
        training.id,
        buildBookedUsersPatch(training, [...current, userId], [userId])
      )
    );
    await notifyTrainingBot({
      event: "book",
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id
    });
    return record;
  } catch (err) {
    throw err;
  }
}
export async function bookUserToTraining(training, userId, targetUser, { overrideAnnualLimit } = {}) {
  try {
    if (!userId) throw new Error("\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C");
    await assertNotBotBlocked(userId);
    const current = training.booked_users || [];
    if (current.includes(userId)) throw new Error("\u0418\u0433\u0440\u043E\u043A \u0443\u0436\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D \u043D\u0430 \u044D\u0442\u0443 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443");
    if (training.max_slots && current.length >= training.max_slots) {
      throw new Error("\u041D\u0435\u0442 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u043C\u0435\u0441\u0442");
    }
    const targetUserData = await pb.collection("users").getOne(userId, {
      fields: "membership_frozen,membership_stopped,membership_type,available_sessions",
      requestKey: null
    });
    if (targetUserData.membership_stopped) {
      throw Object.assign(
        new Error("\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D. \u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430."),
        { code: "MEMBERSHIP_STOPPED" }
      );
    }
    if (targetUserData.membership_frozen) {
      throw Object.assign(
        new Error("\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0437\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D. \u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430."),
        { code: "MEMBERSHIP_FROZEN" }
      );
    }
    const mType = targetUserData.membership_type || "regular";
    if (mType !== "one_time" && !isUnlimitedMembership(mType) && !(Number(targetUserData.available_sessions) > 0)) {
      throw Object.assign(new Error("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0439"), { code: "NO_AVAILABLE_SESSIONS" });
    }
    const record = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(
        training.id,
        buildBookedUsersPatch(training, [...current, userId], [userId])
      )
    );
    await notifyTrainingBot({
      event: "book",
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id
    });
    return record;
  } catch (err) {
    throw err;
  }
}
export async function bookUsersToTraining(training, userIds, targetUsers = [], { overrideAnnualLimit } = {}) {
  try {
    const selectedUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (selectedUserIds.length === 0) throw new Error("\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u044B \u0438\u0433\u0440\u043E\u043A\u0438");
    const current = training.booked_users || [];
    const currentSet = new Set(current);
    const nextUserIds = selectedUserIds.filter((userId) => !currentSet.has(userId));
    if (nextUserIds.length === 0) throw new Error("\u0418\u0433\u0440\u043E\u043A\u0438 \u0443\u0436\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B \u043D\u0430 \u044D\u0442\u0443 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443");
    if (training.max_slots && current.length + nextUserIds.length > training.max_slots) {
      throw new Error("\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u043C\u0435\u0441\u0442");
    }
    if (nextUserIds.length > 0) {
      const statusUsers = await pb.collection("users").getFullList({
        filter: nextUserIds.map((id) => `id = "${id}"`).join(" || "),
        fields: "id,membership_frozen,membership_stopped,bot_blocked,membership_type,available_sessions",
        requestKey: null
      });
      if (statusUsers.some((u) => u.bot_blocked === true)) {
        throw Object.assign(new Error(BOT_BLOCKED_BOOKING_MESSAGE), { code: "BOT_BLOCKED" });
      }
      if (statusUsers.some((u) => u.membership_stopped)) {
        throw Object.assign(
          new Error("\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D. \u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430."),
          { code: "MEMBERSHIP_STOPPED" }
        );
      }
      if (statusUsers.some((u) => u.membership_frozen)) {
        throw Object.assign(
          new Error("\u0410\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0437\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D. \u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430."),
          { code: "MEMBERSHIP_FROZEN" }
        );
      }
      if (statusUsers.some((u) => {
        const t = u.membership_type || "regular";
        if (t === "one_time" || isUnlimitedMembership(t)) return false;
        return !(Number(u.available_sessions) > 0);
      })) {
        throw Object.assign(new Error("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0439"), { code: "NO_AVAILABLE_SESSIONS" });
      }
    }
    const record = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(
        training.id,
        buildBookedUsersPatch(training, [...current, ...nextUserIds], nextUserIds)
      )
    );
    await notifyTrainingBot({
      event: "book",
      userIds: nextUserIds,
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id
    });
    return record;
  } catch (err) {
    throw err;
  }
}
export async function removeUsersFromTraining(training, userIds) {
  try {
    const selectedUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (selectedUserIds.length === 0) throw new Error("\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u044B \u0438\u0433\u0440\u043E\u043A\u0438");
    const current = training.booked_users || [];
    const currentSet = new Set(current);
    const removedUserIds = selectedUserIds.filter((userId) => currentSet.has(userId));
    if (removedUserIds.length === 0) throw new Error("\u0418\u0433\u0440\u043E\u043A\u0438 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B \u043D\u0430 \u044D\u0442\u0443 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443");
    const attended = training.attended_users || [];
    const attendedSet = new Set(attended);
    const removedAttendedUserIds = removedUserIds.filter((userId) => attendedSet.has(userId));
    const currentUnbooked = training.unbooked_users || [];
    const nextUnbooked = Array.from(/* @__PURE__ */ new Set([...currentUnbooked, ...removedUserIds]));
    const currentKicked = training.moderator_kicked_users || [];
    const nextKicked = Array.from(/* @__PURE__ */ new Set([...currentKicked, ...removedUserIds]));
    const record = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(training.id, {
        booked_users: current.filter((id) => !removedUserIds.includes(id)),
        unbooked_users: nextUnbooked,
        moderator_kicked_users: nextKicked,
        ...removedAttendedUserIds.length > 0 ? { attended_users: attended.filter((id) => !removedAttendedUserIds.includes(id)) } : {}
      })
    );
    await notifyTrainingBot({
      event: "unbook",
      userIds: removedUserIds,
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id
    });
    return record;
  } catch (err) {
    throw err;
  }
}
export async function cancelTrainingBooking(training, userId) {
  try {
    const current = training.booked_users || [];
    const attended = training.attended_users || [];
    const shouldRemoveAttendance = attended.includes(userId);
    const currentUnbooked = training.unbooked_users || [];
    const record = (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(training.id, {
        booked_users: current.filter((id) => id !== userId),
        unbooked_users: currentUnbooked.includes(userId) ? currentUnbooked : [...currentUnbooked, userId],
        ...shouldRemoveAttendance ? { attended_users: attended.filter((id) => id !== userId) } : {}
      })
    );
    await notifyTrainingBot({
      event: "unbook",
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id
    });
    return record;
  } catch (err) {
    throw err;
  }
}
export async function markAttendance(training, userId) {
  try {
    if (!userId) throw new Error("\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C");
    const current = training.attended_users || [];
    if (current.includes(userId)) return training;
    return (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(training.id, {
        attended_users: [...current, userId]
      })
    );
  } catch (err) {
    throw err;
  }
}
export async function unmarkAttendance(training, userId) {
  try {
    if (!userId) throw new Error("\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C");
    const current = training.attended_users || [];
    if (!current.includes(userId)) return training;
    return (
      /** @type {TrainingRecord} */
      await pb.collection("trainings").update(training.id, {
        attended_users: current.filter((id) => id !== userId)
      })
    );
  } catch (err) {
    throw err;
  }
}
