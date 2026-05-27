// @ts-check
import pb from './pb';

/**
 * @typedef {Object} UserRecord
 * @property {string} id
 * @property {string} [collectionId]
 * @property {string} [collectionName]
 * @property {string} [full_name]
 * @property {string | string[] | null} [avatar]
 * @property {string} [avatar_url]
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
