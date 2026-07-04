// @ts-check
import pb from './pb';
import { isModerator, getCurrentUser } from './auth';
import { error } from '../lib/log';
import { auditTrainings } from '../lib/audit';
import { hasTimeRangeEnded } from '../lib/format';

export const PENDING_DELETE_TRAININGS_KEY = 'pending_delete_trainings';

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
 * Проверить, что у обычного абонемента есть доступные посещения.
 * Вызывать до обновления booked_users.
 * @param {string} userId
 */
async function assertMembershipSessionAvailable(userId) {
  const user = await fetchMembershipSessionInfo(userId);
  if (isUnlimitedMembership(user.membership_type)) return;

  if ((user.available_sessions || 0) <= 0) {
    throw Object.assign(new Error('Нет доступных посещений'), { code: 'NO_AVAILABLE_SESSIONS' });
  }
}

/**
 * Списать одно посещение абонемента при записи на тренировку.
 * used_sessions — всегда; available_sessions — только для regular.
 * @param {string} userId
 */
async function consumeMembershipSession(userId) {
  const user = await fetchMembershipSessionInfo(userId);
  const unlimited = isUnlimitedMembership(user.membership_type);

  if (!unlimited && (user.available_sessions || 0) <= 0) {
    throw Object.assign(new Error('Нет доступных посещений'), { code: 'NO_AVAILABLE_SESSIONS' });
  }

  const patch = { 'used_sessions+': 1 };
  if (!unlimited) {
    patch['available_sessions-'] = 1;
  }

  await pb.collection('users').update(userId, patch);
}

/**
 * @param {string} trainingId
 * @param {string[]} bookedUsersBefore
 */
async function rollbackTrainingBooking(trainingId, bookedUsersBefore) {
  await pb.collection('trainings').update(trainingId, { booked_users: bookedUsersBefore });
}

/**
 * Вернуть одно посещение в абонемент при отмене записи.
 * used_sessions — всегда; available_sessions — только для regular.
 * @param {string} userId
 */
async function restoreMembershipSession(userId) {
  const user = /** @type {{ membership_type?: string, used_sessions?: number | null }} */ (
    await pb.collection('users').getOne(userId, {
      fields: 'membership_type,used_sessions'
    })
  );

  const patch = {
    used_sessions: Math.max(0, (user.used_sessions || 0) - 1)
  };
  if (!isUnlimitedMembership(user.membership_type)) {
    patch['available_sessions+'] = 1;
  }

  await pb.collection('users').update(userId, patch);
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
    filter: `date >= "${dayStart.toISOString()}" && date <= "${dayEnd.toISOString()}" && booked_users ?~ "${userId}" && is_deleted != true`,
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
      expand: 'booked_users,attended_users,unbooked_users',
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
      filter: 'is_cancelled = true && (booked_users ~ "' + userId + '" || unbooked_users ~ "' + userId + '")',
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
  try {
    const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').create(payload));
    auditTrainings.trainingCreate(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)));
    try {
      await pb.send('/api/bot-notify-training-create', {
        method: 'POST',
        body: { trainingId: record.id }
      });
    } catch (err) {
      error('Ошибка уведомления бота о создании тренировки:', err);
    }
    return record;
  } catch (err) {
    auditTrainings.trainingCreateError(err);
    throw err;
  }
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
      auditTrainings.trainingEdit(trainingId, changedFields);
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
    auditTrainings.trainingEditError(err, trainingId);
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
    if (!ended) {
      const bookedUsers = training.booked_users || [];
      const attended = training.attended_users || [];
      const attendedSet = new Set(attended);
      const attendedBookedUserIds = bookedUsers.filter((userId) => attendedSet.has(userId));

      await Promise.all(bookedUsers.map((userId) => restoreMembershipSession(userId)));
      await Promise.all(
        attendedBookedUserIds.map((userId) =>
          pb.collection('users').update(userId, { 'attendance_count-': 1 })
        )
      );
      attendedBookedUserIds.forEach((userId) => {
        auditTrainings.unmarkAttendance(
          /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (training)),
          userId
        );
      });
    }

    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(trainingId, { is_cancelled: true })
    );
    auditTrainings.trainingCancelFinalized(trainingId);

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
    auditTrainings.trainingDeleteError(err, trainingId);
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
 * Мягкое скрытие тренировки (обратимо до финализации отмены).
 * Без уведомлений и восстановления посещений.
 * @param {string} trainingId
 */
export async function softDeleteTraining(trainingId) {
  try {
    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(trainingId, { is_deleted: true })
    );
    auditTrainings.trainingSoftDelete(trainingId);
    return record;
  } catch (err) {
    auditTrainings.trainingDeleteError(err, trainingId);
    throw err;
  }
}

/**
 * @param {string} trainingId
 */
export async function restoreTraining(trainingId) {
  try {
    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(trainingId, { is_deleted: false })
    );
    auditTrainings.trainingRestore(trainingId);
    return record;
  } catch (err) {
    auditTrainings.trainingStatusError(err, trainingId);
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
  try {
    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(trainingId, { is_closed: true })
    );
    auditTrainings.trainingClose(trainingId);
    await notifyTrainingStatusBot(trainingId, true);
    return record;
  } catch (err) {
    auditTrainings.trainingStatusError(err, trainingId);
    throw err;
  }
}

/**
 * @param {string} trainingId
 */
export async function reopenTraining(trainingId) {
  try {
    const record = /** @type {TrainingRecord} */ (
      await pb.collection('trainings').update(trainingId, { is_closed: false })
    );
    auditTrainings.trainingReopen(trainingId);
    await notifyTrainingStatusBot(trainingId, false);
    return record;
  } catch (err) {
    auditTrainings.trainingStatusError(err, trainingId);
    throw err;
  }
}

/**
 * Записать пользователя на тренировку.
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function bookTraining(training, userId) {
  try {
    if (!userId) throw new Error('Не авторизован');
    const current = training.booked_users || [];
    if (current.includes(userId)) throw new Error('Вы уже записаны на эту тренировку');
    if (training.max_slots && current.length >= training.max_slots) {
      throw new Error('Нет свободных мест');
    }
    if (await checkAnnualDailyLimit(userId, training.date)) {
      throw Object.assign(
        new Error('Годовой абонемент: можно записаться только на одну тренировку в день.'),
        { code: 'ANNUAL_DAILY_LIMIT' }
      );
    }
    await assertMembershipSessionAvailable(userId);
    let record;
    try {
      record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
        booked_users: [...current, userId]
      }));
      await consumeMembershipSession(userId);
    } catch (err) {
      if (record) {
        try {
          await rollbackTrainingBooking(training.id, current);
        } catch (rollbackErr) {
          error('rollback self-booking:', rollbackErr);
        }
      }
      throw err;
    }
    auditTrainings.bookSelf(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)));
    await notifyTrainingBot({
      event: 'book',
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: isModerator()
    });
    return record;
  } catch (err) {
    auditTrainings.bookError(err, training.id);
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
    const current = training.booked_users || [];
    if (current.includes(userId)) throw new Error('Игрок уже записан на эту тренировку');
    if (training.max_slots && current.length >= training.max_slots) {
      throw new Error('Нет свободных мест');
    }
    if (!overrideAnnualLimit && await checkAnnualDailyLimit(userId, training.date)) {
      throw Object.assign(new Error('ANNUAL_DAILY_LIMIT'), { code: 'ANNUAL_DAILY_LIMIT' });
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
    await assertMembershipSessionAvailable(userId);
    let record;
    try {
      record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
        booked_users: [...current, userId]
      }));
      await consumeMembershipSession(userId);
    } catch (err) {
      if (record) {
        try {
          await rollbackTrainingBooking(training.id, current);
        } catch (rollbackErr) {
          error('rollback moderator booking:', rollbackErr);
        }
      }
      throw err;
    }
    const [auditUser] = await resolveAuditUsers(userId ? [userId] : [], targetUser ? [targetUser] : []);
    auditTrainings.bookUser(
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)),
      userId,
      auditUser
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
    auditTrainings.bookError(err, training.id);
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
      const frozenUsers = await pb.collection('users').getFullList({
        filter: nextUserIds.map((id) => `id = "${id}"`).join(' || '),
        fields: 'id,membership_frozen',
        requestKey: null
      });
      if (frozenUsers.some((u) => u.membership_frozen)) {
        throw Object.assign(
          new Error('Абонемент пользователя заморожен. Запись невозможна.'),
          { code: 'MEMBERSHIP_FROZEN' }
        );
      }
    }

    if (!overrideAnnualLimit) {
      const blockedIds = [];
      for (const userId of nextUserIds) {
        if (await checkAnnualDailyLimit(userId, training.date)) {
          blockedIds.push(userId);
        }
      }
      if (blockedIds.length > 0) {
        throw Object.assign(new Error('ANNUAL_DAILY_LIMIT'), {
          code: 'ANNUAL_DAILY_LIMIT',
          blockedIds
        });
      }
    }

    for (const userId of nextUserIds) {
      await assertMembershipSessionAvailable(userId);
    }

    let record;
    try {
      record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
        booked_users: [...current, ...nextUserIds]
      }));
      await Promise.all(nextUserIds.map((id) => consumeMembershipSession(id)));
    } catch (err) {
      if (record) {
        try {
          await rollbackTrainingBooking(training.id, current);
        } catch (rollbackErr) {
          error('rollback bulk booking:', rollbackErr);
        }
      }
      throw err;
    }
    const auditUsers = await resolveAuditUsers(nextUserIds, targetUsers);
    auditTrainings.bookUsers(
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)),
      nextUserIds,
      auditUsers
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
    auditTrainings.bookError(err, training.id);
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
    const auditUsers = await resolveAuditUsers(removedUserIds, getExpandedUsers(training, 'booked_users'));
    const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
      booked_users: current.filter((id) => !removedUserIds.includes(id)),
      unbooked_users: nextUnbooked,
      ...(removedAttendedUserIds.length > 0
        ? { attended_users: attended.filter((id) => !removedAttendedUserIds.includes(id)) }
        : {})
    }));
    await Promise.all(removedUserIds.map((userId) => restoreMembershipSession(userId)));
    await Promise.all(
      removedAttendedUserIds.map((userId) =>
        pb.collection('users').update(userId, { 'attendance_count-': 1 })
      )
    );
    auditTrainings.unbookUsers(
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)),
      removedUserIds,
      auditUsers
    );
    removedAttendedUserIds.forEach((userId) => {
      auditTrainings.unmarkAttendance(
        /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)),
        userId
      );
    });
    await notifyTrainingBot({
      event: 'unbook',
      userIds: removedUserIds,
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: true
    });
    return record;
  } catch (err) {
    auditTrainings.bookError(err, training.id);
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
    await restoreMembershipSession(userId);
    if (shouldRemoveAttendance) {
      await pb.collection('users').update(userId, { 'attendance_count-': 1 });
      auditTrainings.unmarkAttendance(
        /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)),
        userId
      );
    }
    auditTrainings.cancelBookingSelf(
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record))
    );
    await notifyTrainingBot({
      event: 'unbook',
      userIds: [userId],
      totalBookedCount: (record.booked_users || []).length,
      trainingId: training.id,
      actorIsModerator: isModerator()
    });
    return record;
  } catch (err) {
    auditTrainings.bookError(err, training.id);
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
    const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
      attended_users: [...current, userId]
    }));
    await pb.collection('users').update(userId, { 'attendance_count+': 1 });
    auditTrainings.markAttendance(
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)),
      userId
    );
    return record;
  } catch (err) {
    auditTrainings.bookError(err, training.id);
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
    const record = /** @type {TrainingRecord} */ (await pb.collection('trainings').update(training.id, {
      attended_users: current.filter((id) => id !== userId)
    }));
    await pb.collection('users').update(userId, { 'attendance_count-': 1 });
    auditTrainings.unmarkAttendance(
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)),
      userId
    );
    return record;
  } catch (err) {
    auditTrainings.bookError(err, training.id);
    throw err;
  }
}
