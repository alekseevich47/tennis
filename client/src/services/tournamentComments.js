// @ts-check
import pb from './pb';
import { error } from '../lib/log';

/**
 * @typedef {Object} TournamentCommentRecord
 * @property {string} id
 * @property {string} post
 * @property {string} author
 * @property {string} text
 * @property {string} [reply_to]
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
      expand: 'author,reply_to,reply_to.author',
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
 * @param {string | null} [replyToId]
 */
export async function createTournamentComment(postId, text, userId, replyToId = null) {
  if (!userId) throw new Error('Не авторизован: нельзя создать комментарий без author.id');
  /** @type {Record<string, unknown>} */
  const payload = {
    post: postId,
    author: userId,
    text
  };
  if (replyToId) payload.reply_to = replyToId;
  return /** @type {TournamentCommentRecord} */ (await pb.collection('tournament_comments').create(payload, {
    expand: 'author,reply_to,reply_to.author'
  }));
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

export const PENDING_DELETE_TOURNAMENT_COMMENTS_KEY = 'pending_delete_tournament_comments';

/**
 * Физически удаляет комментарии, помеченные soft-delete в sessionStorage.
 */
export async function flushPendingTournamentCommentDeletes() {
  const commentJson = sessionStorage.getItem(PENDING_DELETE_TOURNAMENT_COMMENTS_KEY);
  if (!commentJson) return;

  try {
    const commentIds = JSON.parse(commentJson);
    if (Array.isArray(commentIds) && commentIds.length > 0) {
      await Promise.all(
        commentIds.map((id) =>
          hardDeleteTournamentComment(id).catch((err) => error('flush tournament comment:', err))
        )
      );
    }
  } catch (err) {
    error('Не удалось распарсить pending_delete_tournament_comments:', err);
  } finally {
    sessionStorage.removeItem(PENDING_DELETE_TOURNAMENT_COMMENTS_KEY);
  }
}
