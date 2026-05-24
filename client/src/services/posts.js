// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { PB_URL } from '../config';

/**
 * @typedef {Object} PostRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} [content]
 * @property {string} [text]
 * @property {string | string[]} [media]
 * @property {string} [author]
 * @property {boolean} [is_deleted]
 * @property {number} [likes_count]
 * @property {string} created
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @typedef {Object} CommentRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} post
 * @property {string} author
 * @property {string} text
 * @property {boolean} [is_deleted]
 * @property {string} created
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @typedef {Object} PostLikeRecord
 * @property {string} id
 * @property {string} post
 * @property {string} user
 * @property {string} created
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @param {{ includeDeleted?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<PostRecord[]>}
 */
export async function listPosts({ includeDeleted = false, signal } = {}) {
  try {
    return /** @type {PostRecord[]} */ (await pb.collection('posts').getFullList({
      sort: '-created',
      filter: includeDeleted ? '' : 'is_deleted = false',
      expand: 'comments(post).author',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки ленты:', err);
    throw err;
  }
}

/**
 * @param {string} postId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<CommentRecord[]>}
 */
export async function listCommentsForPost(postId, { signal } = {}) {
  try {
    return /** @type {CommentRecord[]} */ (await pb.collection('comments').getFullList({
      filter: pb.filter('post = {:postId}', { postId }),
      sort: 'created',
      expand: 'author',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки комментариев:', err);
    throw err;
  }
}

/**
 * @param {string} postId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<PostLikeRecord[]>}
 */
export async function listPostLikes(postId, { signal } = {}) {
  if (!postId) return [];

  try {
    return /** @type {PostLikeRecord[]} */ (await pb.collection('post_likes').getFullList({
      filter: pb.filter('post = {:postId}', { postId }),
      expand: 'user',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки лайков поста:', err);
    throw err;
  }
}

/**
 * @param {string} postId
 * @param {string} userId
 * @returns {Promise<PostLikeRecord | null>}
 */
export async function togglePostLike(postId, userId) {
  if (!postId || !userId) return null;

  const existing = /** @type {PostLikeRecord[]} */ (await pb.collection('post_likes').getFullList({
    filter: pb.filter('post = {:postId} && user = {:userId}', { postId, userId }),
    requestKey: null
  }));

  if (existing[0]) {
    await pb.collection('post_likes').delete(existing[0].id);
    return null;
  }

  return /** @type {PostLikeRecord} */ (await pb.collection('post_likes').create({
    post: postId,
    user: userId
  }));
}

/**
 * @param {FormData | Record<string, unknown>} payload
 */
export async function createPost(payload) {
  return pb.collection('posts').create(/** @type {Record<string, unknown>} */ (payload));
}

/**
 * PocketBase SDK uses fetch, which does not expose upload progress. This XHR path is
 * only for media publishing so moderators can keep using the app and cancel upload.
 *
 * @param {FormData} payload
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<PostRecord>}
 */
export function createPostWithProgress(payload, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const rejectAbort = () => {
      if (settled) return;
      settled = true;
      reject(new DOMException('Загрузка публикации отменена', 'AbortError'));
    };

    if (signal?.aborted) {
      rejectAbort();
      return;
    }

    xhr.open('POST', `${PB_URL}/api/collections/posts/records`);
    if (pb.authStore.token) {
      xhr.setRequestHeader('Authorization', pb.authStore.token);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.min(98, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        try {
          resolve(/** @type {PostRecord} */ (JSON.parse(xhr.responseText)));
        } catch (parseErr) {
          reject(parseErr);
        }
        return;
      }
      reject(new Error(`Не удалось опубликовать запись (${xhr.status})`));
    };

    xhr.onerror = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      reject(new Error('Сеть прервала загрузку публикации'));
    };

    xhr.onabort = () => {
      signal?.removeEventListener('abort', abortUpload);
      rejectAbort();
    };

    function abortUpload() {
      xhr.abort();
    }

    signal?.addEventListener('abort', abortUpload, { once: true });
    xhr.send(payload);
  });
}

/**
 * @param {string} postId
 * @param {Partial<PostRecord> | FormData} patch
 */
export async function updatePost(postId, patch) {
  return pb.collection('posts').update(postId, /** @type {Record<string, unknown>} */ (patch));
}

/**
 * @param {string} postId
 */
export async function hardDeletePost(postId) {
  return pb.collection('posts').delete(postId);
}

/**
 * @param {{ postId: string, authorId: string, text: string }} params
 */
export async function createComment({ postId, authorId, text }) {
  if (!authorId) throw new Error('Не авторизован: нельзя создать комментарий без author.id');
  return pb.collection('comments').create({
    post: postId,
    author: authorId,
    text
  });
}

/**
 * @param {string} commentId
 * @param {Partial<CommentRecord>} patch
 */
export async function updateComment(commentId, patch) {
  return pb.collection('comments').update(commentId, /** @type {Record<string, unknown>} */ (patch));
}

/**
 * @param {string} commentId
 */
export async function hardDeleteComment(commentId) {
  return pb.collection('comments').delete(commentId);
}

/**
 * Используется при старте приложения — очищаем «зомби» soft-deleted комменты текущего юзера.
 * @param {string} userId
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function purgeAbandonedComments(userId, { signal } = {}) {
  if (!userId) return [];
  const abandoned = /** @type {CommentRecord[]} */ (await pb.collection('comments').getFullList({
    filter: pb.filter('author = {:userId} && is_deleted = true', { userId }),
    requestKey: null,
    signal
  }));
  await Promise.all(
    abandoned.map((c) => pb.collection('comments').delete(c.id).catch((err) => error('purge comment:', err)))
  );
  return abandoned;
}
