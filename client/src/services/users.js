// @ts-check
import pb from './pb';
import { error } from '../lib/log';

/**
 * @typedef {Object} UserRecord
 * @property {string} id
 * @property {string} [collectionId]
 * @property {string} [collectionName]
 * @property {string} [full_name]
 * @property {string | string[] | null} [avatar]
 * @property {string} [avatar_url]
 * @property {boolean} [is_coach]
 */

/**
 * @returns {Promise<UserRecord[]>}
 */
export async function listUsers() {
  return /** @type {UserRecord[]} */ (await pb.collection('users').getFullList({
    fields: 'id,collectionId,collectionName,full_name,avatar,avatar_url',
    sort: 'full_name'
  }));
}

/**
 * Глобальный пул тренеров (`users.is_coach = true`).
 * @returns {Promise<UserRecord[]>}
 */
export async function listCoachUsers() {
  try {
    return /** @type {UserRecord[]} */ (await pb.collection('users').getFullList({
      filter: 'is_coach = true',
      fields: 'id,full_name,avatar,avatar_url,is_coach',
      sort: 'full_name',
      requestKey: null
    }));
  } catch (err) {
    error('listCoachUsers:', err);
    throw err;
  }
}

/**
 * Синхронизирует глобальный флаг `is_coach` с выбранным набором id (только moderator).
 * @param {string[]} nextIds
 */
export async function syncCoachUsers(nextIds) {
  const next = new Set((nextIds || []).map(String).filter(Boolean));
  const current = await listCoachUsers();
  const currentIds = new Set(current.map((u) => String(u.id)));
  /** @type {Promise<unknown>[]} */
  const ops = [];

  for (const id of next) {
    if (!currentIds.has(id)) {
      ops.push(pb.collection('users').update(id, { is_coach: true }));
    }
  }
  for (const user of current) {
    if (!next.has(String(user.id))) {
      ops.push(pb.collection('users').update(user.id, { is_coach: false }));
    }
  }

  if (ops.length === 0) return;
  try {
    await Promise.all(ops);
  } catch (err) {
    error('syncCoachUsers:', err);
    throw err;
  }
}
