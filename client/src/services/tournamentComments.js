// @ts-check
import pb from './pb';
import { error } from '../lib/log';

/**
 * @typedef {Object} TournamentCommentRecord
 * @property {string} id
 * @property {string} post
 * @property {string} author
 * @property {string} text
 * @property {boolean} [is_deleted]
 * @property {string} created
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @param {string} postId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<TournamentCommentRecord[]>}
 */
export async function listCommentsForTournamentPost(postId, { signal } = {}) {
  try {
    return /** @type {TournamentCommentRecord[]} */ (await pb.collection('tournament_comments').getFullList({
      filter: pb.filter('post = {:postId}', { postId }),
      sort: 'created',
      expand: 'author',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки комментариев турнира:', err);
    throw err;
  }
}

/**
 * @param {string} postId
 * @param {string} text
 * @param {string} userId
 */
export async function createTournamentComment(postId, text, userId) {
  if (!userId) throw new Error('Не авторизован: нельзя создать комментарий без author.id');
  return /** @type {TournamentCommentRecord} */ (await pb.collection('tournament_comments').create({
    post: postId,
    author: userId,
    text
  }, { expand: 'author' }));
}

/**
 * @param {string} commentId
 * @param {Partial<TournamentCommentRecord>} patch
 */
export async function updateTournamentComment(commentId, patch) {
  return /** @type {TournamentCommentRecord} */ (
    await pb.collection('tournament_comments').update(commentId, /** @type {Record<string, unknown>} */ (patch))
  );
}

/**
 * @param {string} commentId
 */
export async function hardDeleteTournamentComment(commentId) {
  return pb.collection('tournament_comments').delete(commentId);
}
