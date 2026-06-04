// @ts-check
import pb from './pb';
import { MAX_AUTH_URL } from '../config';
import { log, error } from '../lib/log';
import { auditProfile } from '../lib/audit';

/**
 * @typedef {Object} UserRecord
 * @property {string} id
 * @property {string} [full_name]
 * @property {string} [role]
 * @property {string} [email]
 * @property {string | string[]} [avatar]
 * @property {string} [avatar_url]
 * @property {number} [age]
 * @property {string} [dominant_hand]
 * @property {number} [rating_points]
 * @property {number} [games_count]
 * @property {number} [wins]
 * @property {number} [losses]
 */

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
      throw new Error('Сервер авторизации MAX вернул ошибку');
    }

    const data = await response.json();

    if (data.token && data.user) {
      let loggedUser = data.user;
      pb.authStore.save(data.token, loggedUser);

      if (loggedUser.id) {
        try {
          loggedUser = await pb.collection('users').getOne(loggedUser.id, { signal });
          pb.authStore.save(data.token, loggedUser);
        } catch (refreshErr) {
          if (refreshErr && /** @type {Error} */ (refreshErr).name === 'AbortError') throw refreshErr;
          error('Ошибка обновления профиля после MAX auth:', refreshErr);
        }
      }

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
 * Безопасное обновление профиля + actualisation через authRefresh (исправляет C10).
 * @param {string} userId
 * @param {Partial<UserRecord> | FormData} patch
 * @returns {Promise<UserRecord>}
 */
export async function updateUserProfile(userId, patch) {
  try {
    const updated = await pb.collection('users').update(userId, /** @type {Record<string, unknown>} */ (patch));
    auditProfile.profileEdit(userId, patch);

    if (hasAvatarPatch(patch)) {
      auditProfile.avatarUpload(userId);
    }

    if (getCurrentUser()?.id === userId) {
      const refreshed = await pb.collection('users').authRefresh();
      return /** @type {UserRecord} */ (refreshed.record);
    }

    return /** @type {UserRecord} */ (updated);
  } catch (err) {
    auditProfile.profileEditError(err, userId);
    throw err;
  }
}
