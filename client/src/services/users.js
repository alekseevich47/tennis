// @ts-check
import pb from './pb';

/**
 * @typedef {Object} UserRecord
 * @property {string} id
 * @property {string} [full_name]
 */

/**
 * @returns {Promise<UserRecord[]>}
 */
export async function listUsers() {
  return /** @type {UserRecord[]} */ (await pb.collection('users').getFullList({
    fields: 'id,full_name',
    sort: 'full_name'
  }));
}
