// @ts-check
import pb from './pb';
import { MAX_AUTH_URL } from '../config';
import { log, error } from '../lib/log';
/**
 * @typedef {Object} UserRecord
 * @property {string} [id]
 * @property {string} [full_name]
 * @property {string} [role]
 * @property {string} [email]
 * @property {string | string[]} [avatar]
 * @property {string} [avatar_url]
 * @property {string} [max_id]
 * @property {string} [dominant_hand]
 * @property {number} [rating_points]
 * @property {number} [wins]
 * @property {boolean} [is_banned]
 * @property {string} [ban_reason]
 * @property {string} [banned_at]
 * @property {boolean} [bot_blocked]
 * @property {string} [bot_blocked_at]
 * @property {boolean} [can_comment]
 * @property {string} [comment_restriction_reason]
 * @property {boolean} [onboarding_completed]
 * @property {boolean} [name_set_in_onboarding]
 */

export const BOT_BLOCKED_APP_MESSAGE =
  'Вы заблокировали или удалили бота в MAX. Для доступа к приложению снова нажмите «Открыть» в боте.';

export const BOT_BLOCKED_BOOKING_MESSAGE =
  'Невозможно записать: пользователь заблокировал бота в MAX, уведомления о тренировках недоступны.';

export const BOT_BLOCKED_TOURNAMENT_MESSAGE =
  'Нельзя выбрать: пользователь заблокировал бота в MAX.';

const BAN_INFO_KEY = 'tennis_ban_info';

/**
 * @param {Partial<UserRecord> | Record<string, unknown>} data
 * @returns {UserRecord}
 */
function buildBannedUser(data) {
  return {
    is_banned: true,
    ban_reason: String(data.ban_reason || data.error || ''),
    banned_at: String(data.banned_at || '')
  };
}

export function saveBanInfo(user) {
  sessionStorage.setItem(BAN_INFO_KEY, JSON.stringify(user));
}

export function clearBanInfo() {
  sessionStorage.removeItem(BAN_INFO_KEY);
}

/**
 * @returns {UserRecord | null}
 */
export function loadBanInfo() {
  try {
    const raw = sessionStorage.getItem(BAN_INFO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.is_banned ? /** @type {UserRecord} */ (parsed) : null;
  } catch {
    return null;
  }
}

/**
 * @param {UserRecord | null | undefined} user
 * @returns {boolean}
 */
export function isUserBanned(user) {
  return user?.is_banned === true;
}

/**
 * @param {UserRecord | null | undefined} user
 * @returns {boolean}
 */
export function isUserBotBlocked(user) {
  return user?.bot_blocked === true && user?.is_banned !== true;
}

/**
 * @param {UserRecord} user
 * @returns {UserRecord}
 */
function finalizeBannedUser(user) {
  pb.authStore.clear();
  const banned = buildBannedUser(user);
  saveBanInfo(banned);
  return banned;
}

/**
 * @param {string} userId
 * @param {AbortSignal} [signal]
 * @returns {Promise<UserRecord>}
 */
export async function refreshAuthUser(userId, signal) {
  const fresh = await pb.collection('users').getOne(userId, { signal });
  if (isUserBanned(/** @type {UserRecord} */ (fresh))) {
    return finalizeBannedUser(/** @type {UserRecord} */ (fresh));
  }
  pb.authStore.save(pb.authStore.token, fresh);
  clearBanInfo();
  return /** @type {UserRecord} */ (fresh);
}

/**
 * Инициализация авторизации через MAX Bridge.
 * @param {string} initData
 * @param {AbortSignal} [signal]
 * @returns {Promise<UserRecord | null>}
 */
export async function initMaxAuth(initData, signal) {
  try {
    const response = await fetch(MAX_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
      signal
    });

    if (!response.ok) {
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        return finalizeBannedUser(/** @type {UserRecord} */ (data));
      }
      throw new Error('Сервер авторизации MAX вернул ошибку');
    }

    const data = await response.json();

    if (data.token && data.user) {
      let loggedUser = /** @type {UserRecord} */ (data.user);
      pb.authStore.save(data.token, loggedUser);

      if (loggedUser.id) {
        try {
          loggedUser = await refreshAuthUser(loggedUser.id, signal);
          if (isUserBanned(loggedUser)) return loggedUser;
        } catch (refreshErr) {
          if (refreshErr && /** @type {Error} */ (refreshErr).name === 'AbortError') throw refreshErr;
          error('Ошибка обновления профиля после MAX auth:', refreshErr);
        }
      } else if (isUserBanned(loggedUser)) {
        return finalizeBannedUser(loggedUser);
      }

      clearBanInfo();
      log('Авторизация в PocketBase успешно зафиксирована для текущего сеанса.');
      return loggedUser;
    }

    return data.user || null;
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return null;
    error('Ошибка initMaxAuth:', err);
    throw err;
  }
}

/**
 * Получение текущего авторизованного пользователя из локального хранилища.
 * @returns {UserRecord | null}
 */
export function getCurrentUser() {
  // pb.authStore.model в SDK типизирован как unknown — приводим к нашему типу.
  return /** @type {UserRecord | null} */ (pb.authStore.model);
}

/**
 * @returns {boolean}
 */
export function isModerator() {
  const user = getCurrentUser();
  if (!user) return false;
  return user.role === 'moderator' || user.email === 'admin@example.com';
}

/**
 * @param {Partial<UserRecord> | FormData} patch
 * @returns {boolean}
 */
function hasAvatarPatch(patch) {
  if (typeof FormData !== 'undefined' && patch instanceof FormData) {
    return patch.has('avatar') || patch.has('avatar_url');
  }

  return Object.prototype.hasOwnProperty.call(patch, 'avatar') ||
    Object.prototype.hasOwnProperty.call(patch, 'avatar_url');
}

/**
 * @param {string} targetUserId
 * @param {string} reason
 * @returns {Promise<UserRecord>}
 */
export async function banUser(targetUserId, reason) {
  const updated = await pb.collection('users').update(targetUserId, {
    is_banned: true,
    ban_reason: reason || '',
    banned_at: new Date().toISOString()
  });
  return /** @type {UserRecord} */ (updated);
}

/**
 * @param {string} targetUserId
 * @returns {Promise<UserRecord>}
 */
export async function unbanUser(targetUserId) {
  const updated = await pb.collection('users').update(targetUserId, {
    is_banned: false,
    ban_reason: '',
    banned_at: ''
  });
  return /** @type {UserRecord} */ (updated);
}

/**
 * @param {string} targetUserId
 * @param {string} reason
 * @returns {Promise<UserRecord>}
 */
export async function restrictComments(targetUserId, reason) {
  const updated = await pb.collection('users').update(targetUserId, {
    can_comment: false,
    comment_restriction_reason: reason || ''
  });
  return /** @type {UserRecord} */ (updated);
}

/**
 * @param {string} targetUserId
 * @returns {Promise<UserRecord>}
 */
export async function unrestrictComments(targetUserId) {
  const updated = await pb.collection('users').update(targetUserId, {
    can_comment: true,
    comment_restriction_reason: ''
  });
  return /** @type {UserRecord} */ (updated);
}

/**
 * @param {string} targetUserId
 * @returns {Promise<UserRecord>}
 */
export async function hideFromRating(targetUserId) {
  const updated = await pb.collection('users').update(targetUserId, { is_visible: false });
  return /** @type {UserRecord} */ (updated);
}

/**
 * @param {string} targetUserId
 * @returns {Promise<UserRecord>}
 */
export async function showInRating(targetUserId) {
  const updated = await pb.collection('users').update(targetUserId, { is_visible: true });
  return /** @type {UserRecord} */ (updated);
}

/**
 * Привязка max_id к ручному профилю (A) или объединение с дублем MAX (B).
 * @param {{ targetUserId: string, maxId?: string, maxUserId?: string }} payload
 * @returns {Promise<{ success: boolean, mode: 'link'|'merge', deletedUserId?: string|null, user: UserRecord }>}
 */
export async function claimMaxAccount(payload) {
  return /** @type {Promise<{ success: boolean, mode: 'link'|'merge', deletedUserId?: string|null, user: UserRecord }>} */ (
    pb.send('/api/users-claim-max', {
      method: 'POST',
      body: payload
    })
  );
}

/**
 * @param {string} targetUserId
 * @returns {Promise<{ success: boolean, maxId: string, user: UserRecord }>}
 */
export async function unclaimMaxAccount(targetUserId) {
  return /** @type {Promise<{ success: boolean, maxId: string, user: UserRecord }>} */ (
    pb.send('/api/users-unclaim-max', {
      method: 'POST',
      body: { targetUserId }
    })
  );
}

/**
 * @param {string} [excludeUserId]
 * @returns {Promise<Array<{ id: string, full_name: string, max_id: string, avatar?: string, avatar_url?: string, email?: string, created?: string, rating_points?: number, available_sessions?: number }>>}
 */
export async function listClaimCandidates(excludeUserId) {
  const qs = excludeUserId ? `?exclude=${encodeURIComponent(excludeUserId)}` : '';
  const data = await pb.send(`/api/users-claim-candidates${qs}`, { method: 'GET' });
  return (data && data.candidates) || [];
}

/**
 * Безопасное обновление профиля + actualisation через authRefresh (исправляет C10).
 * @param {string} userId
 * @param {Partial<UserRecord> | FormData} patch
 * @returns {Promise<UserRecord>}
 */
/**
 * @param {string} userId
 * @returns {Promise<UserRecord>}
 */
export async function completeOnboarding(userId) {
  return updateUserProfile(userId, {
    onboarding_completed: true,
    can_comment: true,
    is_visible: true
  });
}

/**
 * Безопасное обновление профиля + actualisation через authRefresh (исправляет C10).
 * @param {string} userId
 * @param {Partial<UserRecord> | FormData} patch
 * @returns {Promise<UserRecord>}
 */
export async function updateUserProfile(userId, patch) {
  try {
    const updated = await pb.collection('users').update(userId, /** @type {Record<string, unknown>} */ (patch));

    if (getCurrentUser()?.id === userId) {
      const refreshed = await pb.collection('users').authRefresh();
      return /** @type {UserRecord} */ (refreshed.record);
    }

    return /** @type {UserRecord} */ (updated);
  } catch (err) {
    throw err;
  }
}
