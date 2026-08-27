// @ts-check
import pb from './pb';
import { isModerator, getCurrentUser, BOT_BLOCKED_BOOKING_MESSAGE } from './auth';
import { error } from '../lib/log';
import { hasTimeRangeEnded } from '../lib/format';

export const PENDING_DELETE_TRAININGS_KEY = 'pending_delete_trainings';
export const SHOW_DELETED_TRAININGS_KEY = 'trainings_show_deleted_moderator';

/**
 * Уведомить модераторов через MAX Bot API (pb_hooks/bot_notifications.pb.js).
 * @param {{ event: 'book' | 'unbook', userIds: string[], trainingId: string, actorIsModerator: boolean, totalBookedCount: number }} payload
 */
async function notifyTrainingBot(payload) {
  const actorId = getCurrentUser()?.id;
  if (!actorId) return;
  try {
    await pb.send('/api/bot-notify-training', {
      method: 'POST',
      body: { ...payload, actorId }
    });
  } catch (err) {
    error('Ошибка уведомления бота о тренировке:', err);
  }
}

/**
 * @typedef {Object} TrainingRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} date
 * @property {number} [duration]
 * @property {'group' | 'tournament'} [type]
 * @property {number | null} [max_slots]
 * @property {string} [location]
 * @property {string} [description]
 * @property {boolean} [is_deleted]
 * @property {boolean} [is_cancelled]
 * @property {boolean} [is_closed]
 * @property {string[]} [booked_users]
 * @property {string[]} [unbooked_users]
 * @property {string[]} [attended_users]
 * @property {string[]} [moderator_kicked_users]
 * @property {string[]} [restore_insufficient_users]
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @typedef {Object} UserAuditRecord
 * @property {string} id
 * @property {string} [fullName]
 * @property {string} [full_name]
 * @property {string} [email]
 */

/**
 * @param {unknown} user
 */
function getUserId(user) {
  return String(/** @type {{ id?: unknown } | null | undefined} */ (user)?.id || '');
}

/**
 * @param {string} userId
 * @param {unknown} user
 * @returns {UserAuditRecord}
 */
function toAuditUser(userId, user) {
  const record = /** @type {UserAuditRecord | null | undefined} */ (user);
  return {
    id: userId,
    fullName: record?.fullName || record?.full_name || record?.email || 'Пользователь'
  };
}

/**
 * @param {TrainingRecord} training
 * @param {string} relationKey
 * @returns {unknown[]}
 */
function getExpandedUsers(training, relationKey) {
  const expand = /** @type {Record<string, unknown> | undefined} */ (training.expand);
  const users = expand?.[relationKey];
  return Array.isArray(users) ? users : [];
}

/**
 * @param {string[]} userIds
 * @param {unknown[]} [knownUsers]
 * @returns {Promise<UserAuditRecord[]>}
 */
async function resolveAuditUsers(userIds, knownUsers = []) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const usersById = new Map(knownUsers.map((user) => [getUserId(user), user]));
  const missingIds = ids.filter((id) => !usersById.has(id));

  const fetchedUsers = await Promise.all(
    missingIds.map(async (id) => {
      try {
        return await pb.collection('users').getOne(id, {
          fields: 'id,full_name,email',
          requestKey: null
        });
      } catch (err) {
        error('resolve audit user:', err);
        return { id };
      }
    })
  );

  fetchedUsers.forEach((user) => {
    usersById.set(getUserId(user), user);
  });

  return ids.map((id) => toAuditUser(id, usersById.get(id)));
}

/**
 * @param {string} userId
 * @returns {Promise<{ available_sessions?: number | null, membership_type?: string }>}
 */
async function fetchMembershipSessionInfo(userId) {
  return /** @type {{ available_sessions?: number | null, membership_type?: string }} */ (
    await pb.collection('users').getOne(userId, {
      fields: 'available_sessions,membership_type',
      requestKey: null
    })
  );
}

/**
 * @param {string | undefined} membershipType
 */
function isUnlimitedMembership(membershipType) {
  return membershipType === 'annual' || membershipType === 'corporate';
}

/**
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function hasAvailableMembershipSession(userId) {
  const user = await fetchMembershipSessionInfo(userId);
  if (isUnlimitedMembership(user.membership_type)) return true;
  return (user.available_sessions || 0) > 0;
}

/**
 * Проверить, что у обычного абонемента есть доступные посещения.
 * Вызывать до обновления booked_users.
 * @param {string} userId
 */
async function assertMembershipSessionAvailable(userId) {
  if (!(await hasAvailableMembershipSession(userId))) {
    throw Object.assign(new Error('Нет доступных посещений'), { code: 'NO_AVAILABLE_SESSIONS' });
  }
}

/**
 * Пользователь с bot_blocked не может быть записан (нет уведомлений в MAX).
 * @param {string} userId
 */
async function assertNotBotBlocked(userId) {
  const user = await pb.collection('users').getOne(userId, {
    fields: 'bot_blocked',
    requestKey: null
  });
  if (user.bot_blocked === true) {
    throw Object.assign(new Error(BOT_BLOCKED_BOOKING_MESSAGE), { code: 'BOT_BLOCKED' });
  }
}

/**
 * @param {TrainingRecord} training
 * @param {string[]} nextBookedUsers
 * @param {string[]} addedUserIds
 */
function buildBookedUsersPatch(training, nextBookedUsers, addedUserIds) {
  const patch = { booked_users: nextBookedUsers };
  const addedSet = new Set(addedUserIds);
  const kicked = training.moderator_kicked_users || [];
  const insufficient = training.restore_insufficient_users || [];
  const nextKicked = kicked.filter((id) => !addedSet.has(id));
  const nextInsufficient = insufficient.filter((id) => !addedSet.has(id));
  if (nextKicked.length !== kicked.length) patch.moderator_kicked_users = nextKicked;
  if (nextInsufficient.length !== insufficient.length) patch.restore_insufficient_users = nextInsufficient;
  return patch;
}

/**
 * Проверить лимит годового абонемента: не более одной записи в день.
 * @param {string} userId
 * @param {string} trainingDate
 * @returns {Promise<boolean>} true — лимит уже исчерпан
 */
async function checkAnnualDailyLimit(userId, trainingDate) {
  const user = await pb.collection('users').getOne(userId, {
    fields: 'membership_type',
    requestKey: null
  });
  if (user.membership_type !== 'annual') return false;

  const day = new Date(trainingDate);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const result = await pb.collection('trainings').getList(1, 1, {
    filter: pb.filter(
      'date >= {:from} && date <= {:to} && booked_users ?~ {:uid} && is_deleted != true',
      { from: dayStart.toISOString(), to: dayEnd.toISOString(), uid: userId }
    ),
    requestKey: null
  });
  return result.totalItems > 0;
}

/**
 * @param {string} field
 * @param {unknown} before
 * @param {unknown} after
 */
function areTrainingValuesEqual(field, before, after) {
  if (field === 'date') {
    const beforeTime = new Date(String(before || '')).getTime();
    const afterTime = new Date(String(after || '')).getTime();
    if (Number.isFinite(beforeTime) && Number.isFinite(afterTime)) return beforeTime === afterTime;
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    return JSON.stringify(before || []) === JSON.stringify(after || []);
  }

  return before === after;
}

/**
 * @param {TrainingRecord} previous
 * @param {TrainingRecord} next
 * @param {Record<string, unknown>} patch
 */
function getTrainingChangedFields(previous, next, patch) {
  return Object.keys(patch).flatMap((field) => {
    const hasNextValue = Object.prototype.hasOwnProperty.call(next, field);
    const before = /** @type {Record<string, unknown>} */ (previous)[field];
    const after = hasNextValue ? /** @type {Record<string, unknown>} */ (next)[field] : patch[field];

    if (areTrainingValuesEqual(field, before, after)) return [];

    return [{
      field,
      from: before ?? null,
      to: after ?? null
    }];
  });
}

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<TrainingRecord[]>}
 */
export async function listTrainings({ signal } = {}) {
  try {
    return /** @type {TrainingRecord[]} */ (await pb.collection('trainings').getFullList({
      sort: 'date',
      filter: isModerator() ? '' : 'is_deleted != true',
      expand: 'booked_users,attended_users,unbooked_users,moderator_kicked_users,restore_insufficient_users',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки расписания:', err);
    throw err;
  }
}

/**
 * Отменённые тренировки, где пользователь был в booked_users / unbooked_users (бейдж «Отмена»).
 * @param {string} userId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<TrainingRecord[]>}
 */
export async function listCancelledTrainingsForUser(userId, { signal } = {}) {
  if (!userId) return [];
  try {
    return /** @type {TrainingRecord[]} */ (await pb.collection('trainings').getFullList({
      sort: '-date',
      filter: pb.filter(
        'is_cancelled = true && (booked_users ~ {:uid} || unbooked_users ~ {:uid})',
        { uid: userId }
      ),
      fields: 'id,date,duration,type',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки отменённых тренировок:', err);
    throw err;
  }
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function createTraining(payload) {
  const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').create(payload));
  try {
    await pb.send('/api/bot-notify-training-create', {
      method: 'POST',
      body: { trainingId: record.id }
    });
  } catch (err) {
    error('Ошибка уведомления бота о создании тренировки:', err);
  }
  return record;
}

/**
 * @param {string} trainingId
 * @param {Record<string, unknown>} patch
 */
export async function updateTraining(trainingId, patch) {
  try {
    const previous = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').getOne(trainingId, { requestKey: null })
    );
    const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(trainingId, patch));
    const changedFields = getTrainingChangedFields(previous, record, patch);
    if (changedFields.length > 0) {
      const skipNotify =
        previous.is_cancelled === true ||
        hasTimeRangeEnded(previous.date, previous.duration || 0);
      if (!skipNotify) {
        try {
          await pb.send('/api/bot-notify-training-edit', {
            method: 'POST',
            body: { trainingId, changes: changedFields }
          });
        } catch (err) {
          error('Ошибка уведомления бота о редактировании тренировки:', err);
        }
      }
    }
    return record;
  } catch (err) {
    throw err;
  }
}

/**
 * Финализация отмены: is_cancelled = true (запись сохраняется).
 * Восстановление посещений и уведомление — только для ещё не прошедших и не отменённых.
 * @param {string} trainingId
 */
export async function finalizeCancelledTraining(trainingId) {
  try {
    const training = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').getOne(trainingId, {
        expand: 'booked_users',
        requestKey: null
      })
    );
    const alreadyCancelled = training.is_cancelled === true;
    if (alreadyCancelled) {
      return training;
    }

    const ended = hasTimeRangeEnded(training.date, training.duration || 0);
    // Возврат сессий / attendance_count — серверный хук trainings_booking_validate
    // при переходе is_cancelled false→true (симметрия finalizeCancelledTrainingRecord).

    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(trainingId, { is_cancelled: true })
    );

    if (!ended) {
      try {
        await pb.send('/api/bot-notify-training-cancelled', {
          method: 'POST',
          body: { trainingId }
        });
      } catch (err) {
        error('Ошибка уведомления бота об отмене тренировки:', err);
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
    return Array.from(new Set(ids.filter((id) => typeof id === 'string' && id)));
  } catch (err) {
    error('Не удалось распарсить pending_delete_trainings:', err);
    return [];
  }
}

/**
 * @param {string[]} ids
 */
export function writePendingDeleteTrainingIds(ids) {
  const nextIds = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id)));
  if (nextIds.length > 0) {
    sessionStorage.setItem(PENDING_DELETE_TRAININGS_KEY, JSON.stringify(nextIds));
  } else {
    sessionStorage.removeItem(PENDING_DELETE_TRAININGS_KEY);
  }
  return nextIds;
}

/**
 * @param {string} trainingId
 */
export function addPendingDeleteTrainingId(trainingId) {
  return writePendingDeleteTrainingIds([...readPendingDeleteTrainingIds(), trainingId]);
}

/**
 * @param {string} trainingId
 */
export function removePendingDeleteTrainingId(trainingId) {
  return writePendingDeleteTrainingIds(
    readPendingDeleteTrainingIds().filter((id) => id !== trainingId)
  );
}

/**
 * @returns {boolean} true — показывать удалённые тренировки (дефолт)
 */
export function readShowDeletedTrainingsPreference() {
  try {
    const raw = localStorage.getItem(SHOW_DELETED_TRAININGS_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch (err) {
    error('Не удалось прочитать trainings_show_deleted_moderator:', err);
    return true;
  }
}

/**
 * @param {boolean} value
 */
export function writeShowDeletedTrainingsPreference(value) {
  try {
    localStorage.setItem(SHOW_DELETED_TRAININGS_KEY, value ? 'true' : 'false');
  } catch (err) {
    error('Не удалось сохранить trainings_show_deleted_moderator:', err);
  }
  return value;
}

/**
 * Мягкое скрытие тренировки (обратимо до финализации отмены).
 * Без уведомлений и восстановления посещений.
 * @param {string} trainingId
 */
export async function softDeleteTraining(trainingId) {
  return /** @type {TrainingRecord} */ (
    await pb.collection('trainings').update(trainingId, { is_deleted: true })
  );
}

async function notifyTrainingRestoredBot(trainingId) {
  try {
    await pb.send('/api/bot-notify-training-restored', {
      method: 'POST',
      body: { trainingId }
    });
  } catch (err) {
    error('Ошибка уведомления бота о восстановлении тренировки:', err);
  }
}

/**
 * @param {string} trainingId
 * @returns {Promise<{ record: TrainingRecord, insufficientUsers: UserAuditRecord[] }>}
 */
export async function restoreTraining(trainingId) {
  try {
    const training = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').getOne(trainingId, {
        expand: 'booked_users',
        requestKey: null
      })
    );

    let record;
    let insufficientUserIds = [];

    if (training.is_cancelled !== true) {
      record = /** @type {TrainingRecord} */ (
        await pb.collection('trainings').update(trainingId, { is_deleted: false })
      );
      await notifyTrainingRestoredBot(trainingId);
      return { record, insufficientUsers: [] };
    }

    const ended = hasTimeRangeEnded(training.date, training.duration || 0);

    if (ended) {
      record = /** @type {TrainingRecord} */ (
        await pb.collection('trainings').update(trainingId, {
          is_cancelled: false,
          is_deleted: false
        })
      );
    } else {
      const bookedUsers = training.booked_users || [];
      let nextUnbooked = [...(training.unbooked_users || [])];
      let nextAttended = [...(training.attended_users || [])];
      let nextKicked = [...(training.moderator_kicked_users || [])];
      const nextBooked = [];

      for (const userId of bookedUsers) {
        // Запись допустима при 0 available (уходит в unpaid) — restore всегда возвращает в booked.
        nextBooked.push(userId);
        nextKicked = nextKicked.filter((id) => id !== userId);
      }

      // Списание сессий / attendance_count — серверный хук при is_cancelled true→false.
      record = /** @type {TrainingRecord} */ (
        await pb.collection('trainings').update(trainingId, {
          booked_users: nextBooked,
          unbooked_users: nextUnbooked,
          attended_users: nextAttended,
          moderator_kicked_users: nextKicked,
          restore_insufficient_users: insufficientUserIds,
          is_cancelled: false,
          is_deleted: false
        })
      );

    }

    await notifyTrainingRestoredBot(trainingId);

    const insufficientUsers =
      insufficientUserIds.length > 0
        ? await resolveAuditUsers(insufficientUserIds, getExpandedUsers(training, 'booked_users'))
        : [];

    return { record, insufficientUsers };
  } catch (err) {
    throw err;
  }
}

/**
 * Уведомить всех пользователей об открытии/закрытии записи (ручное, не автозакрытие).
 * @param {string} trainingId
 * @param {boolean} isClosed
 */
async function notifyTrainingStatusBot(trainingId, isClosed) {
  try {
    await pb.send('/api/bot-notify-training-status', {
      method: 'POST',
      body: { trainingId, isClosed }
    });
  } catch (err) {
    error('Ошибка уведомления бота о статусе записи:', err);
  }
}

/**
 * @param {string} trainingId
 */
export async function closeTraining(trainingId) {
  const record = /** @type {TrainingRecord} */ (
    await pb.collection('trainings').update(trainingId, { is_closed: true })
  );
  await notifyTrainingStatusBot(trainingId, true);
  return record;
}

/**
 * @param {string} trainingId
 */
export async function reopenTraining(trainingId) {
  const record = /** @type {TrainingRecord} */ (
    await pb.collection('trainings').update(trainingId, { is_closed: false })
  );
  await notifyTrainingStatusBot(trainingId, false);
  return record;
}

/**
 * Записать пользователя на тренировку.
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function bookTraining(training, userId) {
  try {
    if (!userId) throw new Error('Не авторизован');
    await assertNotBotBlocked(userId);
    const current = training.booked_users || [];
    if (current.includes(userId)) throw new Error('Вы уже записаны на эту тренировку');
    if (training.max_slots && current.length >= training.max_slots) {
      throw new Error('Нет свободных мест');
    }
    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(
        training.id,
        buildBookedUsersPatch(training, [...current, userId], [userId])
      )
    );
    await notifyTrainingBot({
      event: 'book',
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: isModerator()
    });
    return record;
  } catch (err) {
    throw err;
  }
}

/**
 * Записать произвольного пользователя на тренировку.
 * @param {TrainingRecord} training
 * @param {string} userId
 * @param {UserAuditRecord} [targetUser]
 * @param {{ overrideAnnualLimit?: boolean }} [options]
 */
export async function bookUserToTraining(training, userId, targetUser, { overrideAnnualLimit } = {}) {
  try {
    if (!userId) throw new Error('Не выбран пользователь');
    await assertNotBotBlocked(userId);
    const current = training.booked_users || [];
    if (current.includes(userId)) throw new Error('Игрок уже записан на эту тренировку');
    if (training.max_slots && current.length >= training.max_slots) {
      throw new Error('Нет свободных мест');
    }
    const targetUserData = await pb.collection('users').getOne(userId, {
      fields: 'membership_frozen,membership_type',
      requestKey: null
    });
    if (targetUserData.membership_frozen) {
      throw Object.assign(
        new Error('Абонемент пользователя заморожен. Запись невозможна.'),
        { code: 'MEMBERSHIP_FROZEN' }
      );
    }
    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(
        training.id,
        buildBookedUsersPatch(training, [...current, userId], [userId])
      )
    );
    await notifyTrainingBot({
      event: 'book',
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: true
    });
    return record;
  } catch (err) {
    throw err;
  }
}

/**
 * Записать несколько пользователей на тренировку одним обновлением.
 * @param {TrainingRecord} training
 * @param {string[]} userIds
 * @param {UserAuditRecord[]} [targetUsers]
 * @param {{ overrideAnnualLimit?: boolean }} [options]
 */
export async function bookUsersToTraining(training, userIds, targetUsers = [], { overrideAnnualLimit } = {}) {
  try {
    const selectedUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (selectedUserIds.length === 0) throw new Error('Не выбраны игроки');

    const current = training.booked_users || [];
    const currentSet = new Set(current);
    const nextUserIds = selectedUserIds.filter((userId) => !currentSet.has(userId));
    if (nextUserIds.length === 0) throw new Error('Игроки уже записаны на эту тренировку');
    if (training.max_slots && current.length + nextUserIds.length > training.max_slots) {
      throw new Error('Недостаточно свободных мест');
    }

    if (nextUserIds.length > 0) {
      const statusUsers = await pb.collection('users').getFullList({
        filter: nextUserIds.map((id) => `id = "${id}"`).join(' || '),
        fields: 'id,membership_frozen,bot_blocked',
        requestKey: null
      });
      if (statusUsers.some((u) => u.bot_blocked === true)) {
        throw Object.assign(new Error(BOT_BLOCKED_BOOKING_MESSAGE), { code: 'BOT_BLOCKED' });
      }
      if (statusUsers.some((u) => u.membership_frozen)) {
        throw Object.assign(
          new Error('Абонемент пользователя заморожен. Запись невозможна.'),
          { code: 'MEMBERSHIP_FROZEN' }
        );
      }
    }

    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(
        training.id,
        buildBookedUsersPatch(training, [...current, ...nextUserIds], nextUserIds)
      )
    );
    await notifyTrainingBot({
      event: 'book',
      userIds: nextUserIds,
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: true
    });
    return record;
  } catch (err) {
    throw err;
  }
}

/**
 * Удалить пользователей из записи на тренировку модератором.
 * @param {TrainingRecord} training
 * @param {string[]} userIds
 */
export async function removeUsersFromTraining(training, userIds) {
  try {
    const selectedUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (selectedUserIds.length === 0) throw new Error('Не выбраны игроки');

    const current = training.booked_users || [];
    const currentSet = new Set(current);
    const removedUserIds = selectedUserIds.filter((userId) => currentSet.has(userId));
    if (removedUserIds.length === 0) throw new Error('Игроки не записаны на эту тренировку');

    const attended = training.attended_users || [];
    const attendedSet = new Set(attended);
    const removedAttendedUserIds = removedUserIds.filter((userId) => attendedSet.has(userId));
    const currentUnbooked = training.unbooked_users || [];
    const nextUnbooked = Array.from(new Set([...currentUnbooked, ...removedUserIds]));
    const currentKicked = training.moderator_kicked_users || [];
    const nextKicked = Array.from(new Set([...currentKicked, ...removedUserIds]));
    const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
      booked_users: current.filter((id) => !removedUserIds.includes(id)),
      unbooked_users: nextUnbooked,
      moderator_kicked_users: nextKicked,
      ...(removedAttendedUserIds.length > 0
        ? { attended_users: attended.filter((id) => !removedAttendedUserIds.includes(id)) }
        : {})
    }));
    await notifyTrainingBot({
      event: 'unbook',
      userIds: removedUserIds,
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: true
    });
    return record;
  } catch (err) {
    throw err;
  }
}

/**
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function cancelTrainingBooking(training, userId) {
  try {
    const current = training.booked_users || [];
    const attended = training.attended_users || [];
    const shouldRemoveAttendance = attended.includes(userId);
    const currentUnbooked = training.unbooked_users || [];
    const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
      booked_users: current.filter((id) => id !== userId),
      unbooked_users: currentUnbooked.includes(userId) ? currentUnbooked : [...currentUnbooked, userId],
      ...(shouldRemoveAttendance ? { attended_users: attended.filter((id) => id !== userId) } : {})
    }));
    await notifyTrainingBot({
      event: 'unbook',
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: isModerator()
    });
    return record;
  } catch (err) {
    throw err;
  }
}

/**
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function markAttendance(training, userId) {
  try {
    if (!userId) throw new Error('Не выбран пользователь');
    const current = training.attended_users || [];
    if (current.includes(userId)) return training;
    return /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
      attended_users: [...current, userId]
    }));
  } catch (err) {
    throw err;
  }
}

/**
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function unmarkAttendance(training, userId) {
  try {
    if (!userId) throw new Error('Не выбран пользователь');
    const current = training.attended_users || [];
    if (!current.includes(userId)) return training;
    return /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
      attended_users: current.filter((id) => id !== userId)
    }));
  } catch (err) {
    throw err;
  }
}
