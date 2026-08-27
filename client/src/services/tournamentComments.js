// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { PB_URL } from '../config';

/**
 * @typedef {Object} TournamentCommentRecord
 * @property {string} id
 * @property {string} post
 * @property {string} author
 * @property {string} text
 * @property {string | string[]} [media]
 * @property {boolean} [caption_above]
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
 * @param {{ mediaFiles?: File[], captionAbove?: boolean, signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 */
export function createTournamentComment(
  postId,
  text,
  userId,
  replyToId = null,
  { mediaFiles = [], captionAbove = false, signal, onProgress } = {}
) {
  if (!userId) throw new Error('Не авторизован: нельзя создать комментарий без author.id');

  const hasMedia = Array.isArray(mediaFiles) && mediaFiles.length > 0;
  if (!hasMedia) {
    /** @type {Record<string, unknown>} */
    const payload = {
      post: postId,
      author: userId,
      text: text || ''
    };
    if (replyToId) payload.reply_to = replyToId;
    if (captionAbove) payload.caption_above = true;
    return /** @type {Promise<TournamentCommentRecord>} */ (
      pb.collection('tournament_comments').create(payload, {
        expand: 'author,reply_to,reply_to.author'
      })
    );
  }

  const formData = new FormData();
  formData.append('post', postId);
  formData.append('author', userId);
  formData.append('text', text || '');
  if (replyToId) formData.append('reply_to', replyToId);
  if (captionAbove) formData.append('caption_above', 'true');
  mediaFiles.forEach((file) => formData.append('media', file));

  return createTournamentCommentWithProgress(formData, { signal, onProgress });
}

/**
 * @param {FormData} payload
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<TournamentCommentRecord>}
 */
export function createTournamentCommentWithProgress(payload, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const rejectAbort = () => {
      if (settled) return;
      settled = true;
      reject(new DOMException('Загрузка комментария отменена', 'AbortError'));
    };

    if (signal?.aborted) {
      rejectAbort();
      return;
    }

    xhr.open(
      'POST',
      `${PB_URL}/api/collections/tournament_comments/records?expand=author,reply_to,reply_to.author`
    );
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
          resolve(/** @type {TournamentCommentRecord} */ (JSON.parse(xhr.responseText)));
        } catch (parseErr) {
          reject(parseErr);
        }
        return;
      }
      reject(new Error(`Не удалось отправить комментарий (${xhr.status})`));
    };

    xhr.onerror = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      reject(new Error('Сеть прервала загрузку комментария'));
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
 * Полная перезапись media турнирного комментария.
 * @param {string} text
 * @param {string[]} originalNames
 * @param {Array<{
 *   filename?: string,
 *   url?: string,
 *   name?: string,
 *   kind?: 'existing' | 'new',
 *   file?: File | null
 * }>} orderedMedia
 * @returns {Promise<FormData>}
 */
export async function buildTournamentCommentMediaReorderFormData(text, originalNames, orderedMedia) {
  const formData = new FormData();
  formData.append('text', text);
  originalNames.forEach((name) => formData.append('media-', name));
  for (const item of orderedMedia) {
    if (item.kind === 'new' && item.file instanceof File) {
      formData.append('media', item.file, item.file.name || item.name || 'file');
      continue;
    }
    if (!item.url) continue;
    const res = await fetch(item.url);
    const blob = await res.blob();
    formData.append(
      'media',
      new File([blob], item.filename || item.name || 'file', {
        type: blob.type || 'application/octet-stream'
      })
    );
  }
  return formData;
}

/**
 * @param {string} commentId
 * @param {Partial<TournamentCommentRecord> | FormData} patch
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
