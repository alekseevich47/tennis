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
 * @property {Array<{ source?: string, publicUrl: string, name?: string, mediaType?: 'image' | 'video', type?: 'file' | 'album' }> | null} [external_media]
 * @property {string} [author]
 * @property {boolean} [is_deleted]
 * @property {boolean} [is_pinned]
 * @property {boolean} [is_scheduled]
 * @property {string | null} [scheduled_at]
 * @property {boolean} [caption_above]
 * @property {string | null} [pinned_at]
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
 * @property {string | string[]} [media]
 * @property {boolean} [caption_above]
 * @property {string} [reply_to]
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
 * @param {Record<string, unknown> | FormData} patch
 * @returns {boolean | null}
 */
function getIsDeletedPatchValue(patch) {
  const rawValue = typeof FormData !== 'undefined' && patch instanceof FormData
    ? patch.get('is_deleted')
    : patch.is_deleted;

  if (rawValue === true || rawValue === 'true') return true;
  if (rawValue === false || rawValue === 'false') return false;
  return null;
}

/**
 * @param {{ includeDeleted?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<PostRecord[]>}
 */
export async function listPosts({ includeDeleted = false, signal } = {}) {
  try {
    const base = includeDeleted ? '' : 'is_deleted = false';
    const scheduled = 'is_scheduled != true';
    const filter = base ? `(${base}) && (${scheduled})` : scheduled;
    return /** @type {PostRecord[]} */ (await pb.collection('posts').getFullList({
      sort: '-created',
      filter,
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
 * Очередь запланированных публикаций ленты (сортировка по времени отправки).
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<PostRecord[]>}
 */
export async function listScheduledPosts({ signal } = {}) {
  try {
    return /** @type {PostRecord[]} */ (await pb.collection('posts').getFullList({
      sort: 'scheduled_at',
      filter: 'is_scheduled = true && is_deleted != true',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки запланированных публикаций:', err);
    throw err;
  }
}

/**
 * @param {string} id
 * @param {string} scheduledAtIso
 */
export async function reschedulePost(id, scheduledAtIso) {
  return /** @type {PostRecord} */ (
    await pb.collection('posts').update(id, {
      scheduled_at: scheduledAtIso,
      is_scheduled: true
    })
  );
}

/**
 * Немедленная публикация из очереди.
 * @param {string} id
 */
export async function publishScheduledPostNow(id) {
  return /** @type {PostRecord} */ (
    await pb.collection('posts').update(id, { is_scheduled: false })
  );
}

/**
 * Удаление из очереди (soft-delete публикации).
 * @param {string} id
 */
export async function deleteScheduledPost(id) {
  return /** @type {PostRecord} */ (
    await pb.collection('posts').update(id, { is_deleted: true, is_scheduled: false })
  );
}

/**
 * @param {string} postId
 * @param {number} [limit]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<CommentRecord[]>}
 */
export async function listRecentCommentsForPost(postId, limit = 2, { signal } = {}) {
  try {
    const page = /** @type {{ items: CommentRecord[] }} */ (
      await pb.collection('comments').getList(1, limit, {
        filter: pb.filter('post = {:postId}', { postId }),
        sort: '-created',
        expand: 'author,reply_to,reply_to.author',
        requestKey: null,
        signal
      })
    );
    return [...page.items].reverse();
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки комментариев:', err);
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
      expand: 'author,reply_to,reply_to.author',
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

  const record = /** @type {PostLikeRecord} */ (await pb.collection('post_likes').create({
    post: postId,
    user: userId
  }));
  return record;
}

/**
 * @param {FormData | Record<string, unknown>} payload
 */
export async function createPost(payload) {
  return /** @type {PostRecord} */ (
    await pb.collection('posts').create(/** @type {Record<string, unknown>} */ (payload))
  );
}

/**
 * @param {FormData} formData
 * @returns {Record<string, unknown>}
 */
export function parsePostCreateFormData(formData) {
  /** @type {Record<string, unknown>} */
  const body = {};
  /** @type {File[]} */
  const mediaFiles = [];

  for (const [key, raw] of formData.entries()) {
    if (raw instanceof File) {
      if (key === 'media') mediaFiles.push(raw);
      else body[key] = raw;
      continue;
    }

    const value = String(raw);
    switch (key) {
      case 'caption_above':
      case 'is_scheduled':
        body[key] = value === 'true';
        break;
      case 'external_media':
        if (!value || value === '[]' || value === 'null') break;
        try {
          const parsed = JSON.parse(value);
          if (parsed != null && (!Array.isArray(parsed) || parsed.length > 0)) {
            body[key] = parsed;
          }
        } catch {
          // пропускаем невалидный JSON
        }
        break;
      case 'content':
        if (value.trim()) body[key] = value.trim();
        break;
      case 'author':
        if (value.trim()) body[key] = value.trim();
        break;
      case 'scheduled_at':
        if (value) body[key] = value;
        break;
      default:
        if (value) body[key] = value;
    }
  }

  if (mediaFiles.length === 1) body.media = mediaFiles[0];
  else if (mediaFiles.length > 1) body.media = mediaFiles;

  return body;
}

/**
 * @param {Record<string, unknown>} body
 * @returns {FormData}
 */
export function postCreateBodyToFormData(body) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    if (key === 'media') {
      const files = Array.isArray(value) ? value : [value];
      files.forEach((file) => {
        if (file instanceof File) formData.append('media', file);
      });
      continue;
    }
    if (key === 'external_media' && typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
      continue;
    }
    if (typeof value === 'boolean') {
      formData.append(key, value ? 'true' : 'false');
      continue;
    }
    formData.append(key, String(value));
  }
  return formData;
}

/**
 * @param {FormData | Record<string, unknown>} payload
 * @returns {boolean}
 */
function postPayloadHasMedia(payload) {
  if (payload instanceof FormData) {
    for (const [key, value] of payload.entries()) {
      if (key === 'media' && value instanceof File && value.size > 0) return true;
    }
    return false;
  }
  const media = payload.media;
  if (media instanceof File) return media.size > 0;
  if (Array.isArray(media)) return media.some((item) => item instanceof File && item.size > 0);
  return false;
}

/**
 * @param {FormData | Record<string, unknown>} payload
 * @returns {boolean}
 */
export function postPayloadHasVideo(payload) {
  const body = payload instanceof FormData ? parsePostCreateFormData(payload) : payload;
  const media = body.media;
  /** @param {unknown} item */
  const isVideo = (item) =>
    item instanceof File && (item.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(item.name));
  if (media instanceof File) return isVideo(media);
  if (Array.isArray(media)) return media.some(isVideo);
  return false;
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isDefinitePostCreateFailure(err) {
  const status = /** @type {{ status?: number, response?: { code?: number } }} */ (err)?.status
    ?? /** @type {{ response?: { code?: number } }} */ (err)?.response?.code;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return status !== 408 && status !== 429;
  }
  return false;
}

/**
 * @param {string} responseText
 * @param {number} status
 * @returns {Error}
 */
function postCreateHttpError(responseText, status) {
  try {
    const parsed = JSON.parse(responseText);
    /** @type {Record<string, { message?: string }>} */
    const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : {};
    const fieldMessages = Object.values(data)
      .map((entry) => (entry?.message ? String(entry.message).trim() : ''))
      .filter(Boolean);
    const message =
      fieldMessages.join('; ')
      || (typeof parsed?.message === 'string' ? parsed.message.trim() : '')
      || `Не удалось опубликовать запись (${status})`;
    return Object.assign(new Error(message), { status, response: parsed });
  } catch {
    return Object.assign(new Error(`Не удалось опубликовать запись (${status})`), { status });
  }
}

/**
 * @param {FormData | Record<string, unknown>} payload
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<PostRecord>}
 */
export async function publishPost(payload, { signal, onProgress } = {}) {
  const body =
    payload instanceof FormData ? parsePostCreateFormData(payload) : payload;

  if (postPayloadHasMedia(body)) {
    return createPostWithProgress(postCreateBodyToFormData(body), { signal, onProgress });
  }

  onProgress?.(30);
  const record = /** @type {PostRecord} */ (
    await pb.collection('posts').create(body, { signal, requestKey: null })
  );
  onProgress?.(100);
  return record;
}

const RECENT_POST_RECOVERY_MS = 120000;

/**
 * Если create вернул ошибку, но запись на сервере уже есть (хук ffmpeg и т.п.).
 *
 * @param {FormData | Record<string, unknown>} payload
 * @returns {Promise<PostRecord | null>}
 */
export async function tryRecoverRecentPost(payload) {
  const body = payload instanceof FormData ? parsePostCreateFormData(payload) : payload;
  const authorId = String(body.author || pb.authStore.model?.id || '');
  if (!authorId) return null;

  try {
    const posts = await listPosts();
    const now = Date.now();
    for (const post of posts) {
      if (post.author !== authorId || post.is_scheduled) continue;
      const age = now - new Date(post.created).getTime();
      if (age >= 0 && age < RECENT_POST_RECOVERY_MS) {
        return post;
      }
    }
  } catch (err) {
    error('recover recent post:', err);
  }
  return null;
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
    xhr.responseType = 'text';
    xhr.timeout = 600000;

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
          const record = /** @type {PostRecord} */ (JSON.parse(xhr.responseText));
          resolve(record);
        } catch (parseErr) {
          reject(parseErr);
        }
        return;
      }
      reject(postCreateHttpError(xhr.responseText, xhr.status));
    };

    xhr.onerror = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      reject(new Error('Сеть прервала загрузку публикации'));
    };

    xhr.ontimeout = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      reject(new Error('Превышено время ожидания ответа сервера'));
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
  return /** @type {PostRecord} */ (
    await pb.collection('posts').update(postId, /** @type {Record<string, unknown>} */ (patch))
  );
}

/**
 * @param {string} postId
 * @returns {Promise<PostRecord>}
 */
export async function pinPost(postId) {
  return updatePost(postId, { is_pinned: true, pinned_at: new Date().toISOString() });
}

/**
 * @param {string} postId
 * @returns {Promise<PostRecord>}
 */
export async function unpinPost(postId) {
  return updatePost(postId, { is_pinned: false, pinned_at: null });
}

/**
 * @param {string} postId
 */
export async function hardDeletePost(postId) {
  return pb.collection('posts').delete(postId);
}

/**
 * Зомби soft-delete: is_deleted=true без pending-restore в текущей сессии
 * (после закрытия приложения / сбоя flush). Вызывать при старте у модератора.
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function purgeAbandonedPosts({ signal } = {}) {
  const abandoned = /** @type {PostRecord[]} */ (await pb.collection('posts').getFullList({
    filter: 'is_deleted = true',
    requestKey: null,
    signal
  }));
  await Promise.all(
    abandoned.map((p) => hardDeletePost(p.id).catch((err) => error('purge post:', err)))
  );
  return abandoned;
}

/**
 * @param {{
 *   postId: string,
 *   authorId: string,
 *   text?: string,
 *   replyToId?: string | null,
 *   mediaFiles?: File[],
 *   captionAbove?: boolean
 * }} params
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 */
export function createComment({
  postId,
  authorId,
  text = '',
  replyToId = null,
  mediaFiles = [],
  captionAbove = false
}, { signal, onProgress } = {}) {
  if (!authorId) throw new Error('Не авторизован: нельзя создать комментарий без author.id');

  const hasMedia = Array.isArray(mediaFiles) && mediaFiles.length > 0;
  if (!hasMedia) {
    /** @type {Record<string, unknown>} */
    const payload = {
      post: postId,
      author: authorId,
      text: text || ''
    };
    if (replyToId) payload.reply_to = replyToId;
    if (captionAbove) payload.caption_above = true;
    return /** @type {Promise<CommentRecord>} */ (
      pb.collection('comments').create(payload, {
        expand: 'author,reply_to,reply_to.author'
      })
    );
  }

  const formData = new FormData();
  formData.append('post', postId);
  formData.append('author', authorId);
  formData.append('text', text || '');
  if (replyToId) formData.append('reply_to', replyToId);
  if (captionAbove) formData.append('caption_above', 'true');
  mediaFiles.forEach((file) => formData.append('media', file));

  return createCommentWithProgress(formData, { signal, onProgress });
}

/**
 * @param {FormData} payload
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<CommentRecord>}
 */
export function createCommentWithProgress(payload, { signal, onProgress } = {}) {
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

    xhr.open('POST', `${PB_URL}/api/collections/comments/records?expand=author,reply_to,reply_to.author`);
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
          resolve(/** @type {CommentRecord} */ (JSON.parse(xhr.responseText)));
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
 * Полная перезапись media комментария (порядок / удаление / новые файлы).
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
export async function buildCommentMediaReorderFormData(text, originalNames, orderedMedia) {
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
 * @param {Partial<CommentRecord> | FormData} patch
 */
export async function updateComment(commentId, patch) {
  return /** @type {CommentRecord} */ (
    await pb.collection('comments').update(commentId, /** @type {Record<string, unknown>} */ (patch))
  );
}

/**
 * @param {string} commentId
 * @param {string} [postId]
 */
export async function hardDeleteComment(commentId, postId) {
  return pb.collection('comments').delete(commentId);
}

/**
 * @typedef {Object} CommentLikeRecord
 * @property {string} id
 * @property {string} comment
 * @property {string} comment_collection
 * @property {string} author
 * @property {string} created
 */

/**
 * @param {string[]} commentIds
 * @param {'comments' | 'tournament_comments' | 'gallery_comments'} collection
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<CommentLikeRecord[]>}
 */
export async function listCommentLikes(commentIds, collection, { signal } = {}) {
  if (!commentIds?.length) return [];

  const filterParts = commentIds.map((id) => pb.filter('comment = {:id}', { id }));
  const filter = `(${filterParts.join(' || ')}) && comment_collection = "${collection}"`;

  try {
    return /** @type {CommentLikeRecord[]} */ (await pb.collection('comment_likes').getFullList({
      filter,
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки лайков комментариев:', err);
    throw err;
  }
}

/**
 * @param {string} commentId
 * @param {'comments' | 'tournament_comments' | 'gallery_comments'} collection
 * @param {string} userId
 * @returns {Promise<CommentLikeRecord | null>}
 */
export async function toggleCommentLike(commentId, collection, userId) {
  if (!commentId || !userId) return null;

  const existing = /** @type {CommentLikeRecord[]} */ (await pb.collection('comment_likes').getFullList({
    filter: pb.filter(
      'comment = {:commentId} && comment_collection = {:collection} && author = {:userId}',
      { commentId, collection, userId }
    ),
    requestKey: null
  }));

  if (existing[0]) {
    await pb.collection('comment_likes').delete(existing[0].id);
    return null;
  }

  return /** @type {CommentLikeRecord} */ (await pb.collection('comment_likes').create({
    comment: commentId,
    comment_collection: collection,
    author: userId
  }));
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
    abandoned.map((c) => hardDeleteComment(c.id, c.post).catch((err) => error('purge comment:', err)))
  );
  return abandoned;
}
