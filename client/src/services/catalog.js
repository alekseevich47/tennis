// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { PB_URL } from '../config';

/**
 * @typedef {Object} ProductRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} [title]
 * @property {string} [description]
 * @property {number} [price]
 * @property {string} [sizes]
 * @property {string[]} [images]
 * @property {string[]} [categories]
 * @property {boolean} [out_of_stock]
 * @property {boolean} [is_deleted]
 * @property {number} [views]
 * @property {number} [favorites_count]
 * @property {string} created
 */

/**
 * @typedef {Object} ProductCategoryRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} name
 */

/**
 * @typedef {Object} PlayerRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} [full_name]
 * @property {string} [dominant_hand]
 * @property {number} [rating_points]
 * @property {number} [wins]
 * @property {string | string[]} [avatar]
 * @property {string} [avatar_url]
 * @property {string} [birth_date]
 * @property {string} [section_start_date]
 * @property {string} [created]
 * @property {number} [available_sessions]
 * @property {number} [used_sessions]
 * @property {number} [attendance_count]
 * @property {string} [role]
 * @property {string} [email]
 * @property {string | number} [max_id]
 */

/**
 * @typedef {Object} GalleryRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string | string[]} [image]
 * @property {string | string[]} [video]
 * @property {number} [aspect_ratio]
 * @property {string} [media_type]
 * @property {string} created
 */

/**
 * @typedef {Object} GalleryLikeRecord
 * @property {string} id
 * @property {string} media_id
 * @property {string} user
 * @property {string} created
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @typedef {Object} GalleryCommentRecord
 * @property {string} id
 * @property {string} media_id
 * @property {string} author
 * @property {string} text
 * @property {boolean} [is_deleted]
 * @property {string} created
 * @property {Record<string, unknown>} [expand]
 */

// --- ПРОДУКТЫ ---------------------------------------------------------------

/** @param {{ signal?: AbortSignal }} [options] */
export async function listProductCategories({ signal } = {}) {
  try {
    return /** @type {ProductCategoryRecord[]} */ (await pb.collection('product_categories').getFullList({
      sort: 'name',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения категорий товаров:', err);
    throw err;
  }
}

/** @param {{ categoryId?: string, signal?: AbortSignal }} [options] */
export async function listProducts({ categoryId, signal } = {}) {
  try {
    const filter = categoryId
      ? pb.filter('is_deleted = false && categories.id ?= {:categoryId}', { categoryId })
      : 'is_deleted = false';

    return /** @type {ProductRecord[]} */ (await pb.collection('products').getFullList({
      sort: '-views,-created',
      filter,
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения товаров:', err);
    throw err;
  }
}

/** @param {string} productId */
export async function incrementProductViews(productId) {
  if (!productId) return null;
  return /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, { 'views+': 1 })
  );
}

/**
 * @param {string} productId
 * @param {1 | -1} delta
 */
export async function adjustProductFavoritesCount(productId, delta) {
  if (!productId || (delta !== 1 && delta !== -1)) return null;
  const patch = delta === 1
    ? { 'favorites_count+': 1 }
    : { 'favorites_count-': 1 };
  return /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, patch)
  );
}

/** @param {FormData | Record<string, unknown>} payload */
export async function createProduct(payload) {
  return /** @type {ProductRecord} */ (
    await pb.collection('products').create(/** @type {Record<string, unknown>} */ (payload))
  );
}

/**
 * @param {FormData} payload
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<ProductRecord>}
 */
export function createProductWithProgress(payload, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const rejectAbort = () => {
      if (settled) return;
      settled = true;
      reject(new DOMException('Загрузка товара отменена', 'AbortError'));
    };

    if (signal?.aborted) {
      rejectAbort();
      return;
    }

    xhr.open('POST', `${PB_URL}/api/collections/products/records`);
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
          const record = /** @type {ProductRecord} */ (JSON.parse(xhr.responseText));
          resolve(record);
        } catch (parseErr) {
          reject(parseErr);
        }
        return;
      }
      reject(new Error(`Не удалось создать товар (${xhr.status})`));
    };

    xhr.onerror = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      reject(new Error('Сеть прервала загрузку товара'));
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
 * @param {string} productId
 * @param {FormData | Record<string, unknown>} payload
 */
export async function updateProduct(productId, payload) {
  return /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, /** @type {Record<string, unknown>} */ (payload))
  );
}

/** @param {string} productId */
export async function softDeleteProduct(productId) {
  return /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, { is_deleted: true })
  );
}

/** @param {string} productId */
export async function restoreProduct(productId) {
  return /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, { is_deleted: false })
  );
}

/** @param {string} productId */
export async function deleteProduct(productId) {
  return pb.collection('products').delete(productId);
}

// --- ИГРОКИ -----------------------------------------------------------------

/** @param {{ signal?: AbortSignal, filter?: string }} [options] */
export async function listPlayers({ signal, filter } = {}) {
  try {
    return /** @type {PlayerRecord[]} */ (await pb.collection('users').getFullList({
      sort: '-rating_points',
      filter: filter || '',
      fields: [
        'id',
        'collectionId',
        'collectionName',
        'full_name',
        'avatar',
        'avatar_url',
        'birth_date',
        'dominant_hand',
        'section_start_date',
        'created',
        'available_sessions',
        'used_sessions',
        'attendance_count',
        'rating_points',
        'wins',
        'role',
        'email',
        'max_id',
        'is_visible',
        'is_banned',
        'bot_blocked'
      ].join(','),
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения игроков:', err);
    throw err;
  }
}

function randomAuthSecret() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
  }
  return `${Date.now()}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/**
 * @param {FormData | Record<string, unknown>} payload
 * @returns {FormData | Record<string, unknown>}
 */
function buildManualPlayerPayload(payload) {
  const email = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@local.tennis`;
  const password = randomAuthSecret();

  if (payload instanceof FormData) {
    const data = new FormData();
    for (const [key, value] of payload.entries()) {
      if (key === 'birth_date' && !value) continue;
      data.append(key, value);
    }
    data.append('email', email);
    data.append('password', password);
    data.append('passwordConfirm', password);
    data.append('role', 'user');
    data.append('wins', '0');
    return data;
  }

  const { birth_date, ...rest } = payload;
  return {
    ...rest,
    ...(birth_date ? { birth_date } : {}),
    email,
    password,
    passwordConfirm: password,
    role: 'user',
    wins: 0
  };
}

/** @param {FormData | Record<string, unknown>} payload */
export async function createPlayer(payload) {
  const data = buildManualPlayerPayload(payload);
  return pb.collection('users').create(/** @type {Record<string, unknown>} */ (data));
}

/**
 * @param {string} playerId
 * @param {FormData | Record<string, unknown>} payload
 */
export async function updatePlayer(playerId, payload) {
  return pb.collection('users').update(playerId, /** @type {Record<string, unknown>} */ (payload));
}

// --- ГАЛЕРЕЯ ---------------------------------------------------------------

/** @param {{ signal?: AbortSignal }} [options] */
export async function listGallery({ signal } = {}) {
  try {
    return /** @type {GalleryRecord[]} */ (await pb.collection('gallery').getFullList({
      sort: '-created',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения галереи:', err);
    throw err;
  }
}

/**
 * @param {{ file: File, aspect_ratio?: number, media_type?: string }} item
 * @returns {FormData}
 */
function createGalleryFormData(item) {
  const data = new FormData();
  const mediaType = item.media_type || (item.file.type.startsWith('video/') ? 'video' : 'image');
  const fieldName = mediaType === 'video' ? 'video' : 'image';

  data.append(fieldName, item.file);
  data.append('media_type', mediaType);
  if (typeof item.aspect_ratio === 'number' && Number.isFinite(item.aspect_ratio)) {
    data.append('aspect_ratio', String(item.aspect_ratio));
  }

  return data;
}

/**
 * @param {FormData} payload
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<GalleryRecord>}
 */
export function createGalleryItemWithProgress(payload, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const rejectAbort = () => {
      if (settled) return;
      settled = true;
      reject(new DOMException('Загрузка галереи отменена', 'AbortError'));
    };

    if (signal?.aborted) {
      rejectAbort();
      return;
    }

    xhr.open('POST', `${PB_URL}/api/collections/gallery/records`);
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
          const record = /** @type {GalleryRecord} */ (JSON.parse(xhr.responseText));
          resolve(record);
        } catch (parseErr) {
          reject(parseErr);
        }
        return;
      }
      reject(new Error(`Не удалось создать элемент галереи (${xhr.status})`));
    };

    xhr.onerror = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      const err = new Error('Сеть прервала загрузку галереи');
      reject(err);
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

/** @param {File | { file: File, aspect_ratio?: number, media_type?: string }} payload */
export async function addGalleryImage(payload) {
  const item = payload && 'file' in payload ? payload : { file: payload };
  const data = createGalleryFormData(item);
  return /** @type {GalleryRecord} */ (await pb.collection('gallery').create(data));
}

/**
 * @param {'gallery_likes' | 'gallery_comments'} collectionName
 * @param {string} mediaId
 */
async function deleteGalleryRelatedRecords(collectionName, mediaId) {
  const records = await pb.collection(collectionName).getFullList({
    filter: pb.filter('media_id = {:mediaId}', { mediaId }),
    requestKey: null
  });

  await Promise.all(records.map((record) => pb.collection(collectionName).delete(record.id)));
}

/** @param {string} imageId */
export async function deleteGalleryImage(imageId) {
  const relatedDeleteResults = await Promise.allSettled([
    deleteGalleryRelatedRecords('gallery_likes', imageId),
    deleteGalleryRelatedRecords('gallery_comments', imageId)
  ]);

  try {
    return await pb.collection('gallery').delete(imageId);
  } catch (err) {
    relatedDeleteResults
      .filter((result) => result.status === 'rejected')
      .forEach((result) => error('delete gallery related records:', result.reason));
    throw err;
  }
}

/** @param {string[]} ids */
export async function deleteGalleryImages(ids) {
  return Promise.all(ids.map((imageId) => deleteGalleryImage(imageId)));
}

/**
 * @param {string} mediaId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<GalleryLikeRecord[]>}
 */
export async function listGalleryLikes(mediaId, { signal } = {}) {
  if (!mediaId) return [];

  try {
    return /** @type {GalleryLikeRecord[]} */ (await pb.collection('gallery_likes').getFullList({
      filter: pb.filter('media_id = {:mediaId}', { mediaId }),
      expand: 'user',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки лайков галереи:', err);
    throw err;
  }
}

/**
 * @param {string} mediaId
 * @param {string} userId
 * @returns {Promise<GalleryLikeRecord | null>}
 */
export async function toggleGalleryLike(mediaId, userId) {
  if (!mediaId || !userId) return null;

  const existing = /** @type {GalleryLikeRecord[]} */ (await pb.collection('gallery_likes').getFullList({
    filter: pb.filter('media_id = {:mediaId} && user = {:userId}', { mediaId, userId }),
    requestKey: null
  }));

  if (existing[0]) {
    await pb.collection('gallery_likes').delete(existing[0].id);
    return null;
  }

  return /** @type {GalleryLikeRecord} */ (await pb.collection('gallery_likes').create({
    media_id: mediaId,
    user: userId
  }));
}

/**
 * @param {string} mediaId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<GalleryCommentRecord[]>}
 */
export async function listGalleryComments(mediaId, { signal } = {}) {
  if (!mediaId) return [];

  try {
    return /** @type {GalleryCommentRecord[]} */ (await pb.collection('gallery_comments').getFullList({
      filter: pb.filter('media_id = {:mediaId} && is_deleted = false', { mediaId }),
      sort: 'created',
      expand: 'author',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки комментариев галереи:', err);
    throw err;
  }
}

/**
 * @param {{ mediaId: string, authorId: string, text: string }} params
 */
export async function createGalleryComment({ mediaId, authorId, text }) {
  if (!authorId) throw new Error('Не авторизован: нельзя создать комментарий без author.id');

  return /** @type {GalleryCommentRecord} */ (await pb.collection('gallery_comments').create({
    media_id: mediaId,
    author: authorId,
    text
  }, { expand: 'author' }));
}

/**
 * @param {string} commentId
 * @param {string} [mediaId]
 */
export async function deleteGalleryComment(commentId, mediaId) {
  return pb.collection('gallery_comments').delete(commentId);
}

/**
 * @param {string} commentId
 * @param {string} text
 * @param {string} [mediaId]
 */
export async function updateGalleryComment(commentId, text, mediaId) {
  return /** @type {GalleryCommentRecord} */ (
    await pb.collection('gallery_comments').update(commentId, { text })
  );
}
