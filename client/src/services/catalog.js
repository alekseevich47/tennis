// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { auditGallery, auditShop } from '../lib/audit';
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
 * @property {string} [name]
 * @property {string} [full_name]
 * @property {number} [birth_year]
 * @property {string} [hand]
 * @property {string} [dominant_hand]
 * @property {number} [rating_points]
 * @property {number} [games_count]
 * @property {number} [wins]
 * @property {number} [losses]
 * @property {string | string[]} [avatar]
 * @property {string} [avatar_url]
 * @property {string} [birth_date]
 * @property {string} [section_start_date]
 * @property {string} [created]
 * @property {number} [available_sessions]
 * @property {number} [attendance_count]
 * @property {string} [role]
 * @property {string} [email]
 * @property {string | number} [max_id]
 */

/**
 * @typedef {Object} ChampionshipRecord
 * @property {string} id
 * @property {string} name
 * @property {boolean} [is_active]
 */

/**
 * @typedef {Object} MatchRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} championship
 * @property {string} player1
 * @property {string} player2
 * @property {string} date_time
 * @property {'scheduled' | 'finished' | 'cancelled'} status
 * @property {number} [score_p1]
 * @property {number} [score_p2]
 * @property {string} [sets]
 * @property {Record<string, unknown>} [expand]
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

/**
 * @typedef {Object} OrderItemRecord
 * @property {string} productId
 * @property {string} title
 * @property {number} [price]
 * @property {string} [imageFileName]
 * @property {string} [collectionId]
 * @property {string} [productCollectionId]
 */

/**
 * @typedef {Object} OrderRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} user
 * @property {OrderItemRecord[]} items
 * @property {'pending' | 'completed' | 'cancelled'} status
 * @property {string} created
 * @property {string} updated
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
      sort: '-created',
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

/** @param {FormData | Record<string, unknown>} payload */
export async function createProduct(payload) {
  const record = /** @type {ProductRecord} */ (
    await pb.collection('products').create(/** @type {Record<string, unknown>} */ (payload))
  );
  auditShop.productCreate(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)));
  return record;
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
          auditShop.productCreate(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)));
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
  const record = /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, /** @type {Record<string, unknown>} */ (payload))
  );
  auditShop.productEdit(productId, payload);
  return record;
}

/** @param {string} productId */
export async function softDeleteProduct(productId) {
  const record = /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, { is_deleted: true })
  );
  auditShop.productSoftDelete(productId);
  return record;
}

/** @param {string} productId */
export async function restoreProduct(productId) {
  const record = /** @type {ProductRecord} */ (
    await pb.collection('products').update(productId, { is_deleted: false })
  );
  auditShop.productRestore(productId);
  return record;
}

/** @param {string} productId */
export async function deleteProduct(productId) {
  const result = await pb.collection('products').delete(productId);
  auditShop.productHardDelete(productId);
  return result;
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
        'name',
        'avatar',
        'avatar_url',
        'birth_year',
        'birth_date',
        'hand',
        'dominant_hand',
        'section_start_date',
        'created',
        'available_sessions',
        'attendance_count',
        'rating_points',
        'games_count',
        'wins',
        'losses',
        'role',
        'email',
        'max_id'
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

/** @param {FormData | Record<string, unknown>} payload */
export async function createPlayer(payload) {
  return pb.collection('users').create(/** @type {Record<string, unknown>} */ (payload));
}

/**
 * @param {string} playerId
 * @param {FormData | Record<string, unknown>} payload
 */
export async function updatePlayer(playerId, payload) {
  return pb.collection('users').update(playerId, /** @type {Record<string, unknown>} */ (payload));
}

// --- ЧЕМПИОНАТЫ / МАТЧИ ----------------------------------------------------

/** @param {{ signal?: AbortSignal }} [options] */
export async function listChampionships({ signal } = {}) {
  try {
    return /** @type {ChampionshipRecord[]} */ (await pb.collection('championships').getFullList({
      filter: 'is_active = true',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения чемпионатов:', err);
    throw err;
  }
}

/** @param {{ name: string, is_active?: boolean }} payload */
export async function createChampionship(payload) {
  return pb.collection('championships').create({ is_active: true, ...payload });
}

/**
 * @param {string} championshipId
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function listMatches(championshipId, { signal } = {}) {
  try {
    return /** @type {MatchRecord[]} */ (await pb.collection('matches').getFullList({
      filter: championshipId ? pb.filter('championship = {:championshipId}', { championshipId }) : '',
      sort: 'date_time',
      expand: 'player1,player2,championship',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения матчей:', err);
    throw err;
  }
}

/** @param {Record<string, unknown>} payload */
export async function createMatch(payload) {
  return pb.collection('matches').create(payload);
}

/**
 * Обновление результата матча. Если матч завершён — параллельно подтягиваем игроков и
 * пересчитываем их статистику (применено правило async-parallel).
 *
 * @param {string} matchId
 * @param {{
 *   status: 'scheduled' | 'finished' | 'cancelled',
 *   score_p1?: number,
 *   score_p2?: number,
 *   sets?: string,
 *   player1?: string,
 *   player2?: string
 * }} payload
 */
export async function updateMatchResult(matchId, payload) {
  const record = await pb.collection('matches').update(matchId, payload);

  if (
    payload.status === 'finished' &&
    typeof payload.score_p1 === 'number' &&
    typeof payload.score_p2 === 'number' &&
    payload.player1 &&
    payload.player2
  ) {
    await updatePlayerStats({
      player1Id: payload.player1,
      player2Id: payload.player2,
      score1: payload.score_p1,
      score2: payload.score_p2
    });
  }

  return record;
}

/**
 * @param {{ player1Id: string, player2Id: string, score1: number, score2: number }} params
 */
async function updatePlayerStats({ player1Id, player2Id, score1, score2 }) {
  try {
    // Параллельный fetch обоих игроков (H1 / async-parallel).
    const [player1, player2] = await Promise.all([
      pb.collection('users').getOne(player1Id),
      pb.collection('users').getOne(player2Id)
    ]);

    const p1Games = (player1.games_count || 0) + 1;
    const p2Games = (player2.games_count || 0) + 1;

    let p1Wins = player1.wins || 0;
    let p1Losses = player1.losses || 0;
    let p2Wins = player2.wins || 0;
    let p2Losses = player2.losses || 0;
    let p1Rating = player1.rating_points || 0;
    let p2Rating = player2.rating_points || 0;

    if (score1 > score2) {
      p1Wins += 1;
      p2Losses += 1;
      p1Rating += 10;
      p2Rating -= 5;
    } else if (score2 > score1) {
      p2Wins += 1;
      p1Losses += 1;
      p2Rating += 10;
      p1Rating -= 5;
    }

    await Promise.all([
      pb.collection('users').update(player1Id, {
        games_count: p1Games,
        wins: p1Wins,
        losses: p1Losses,
        rating_points: p1Rating
      }),
      pb.collection('users').update(player2Id, {
        games_count: p2Games,
        wins: p2Wins,
        losses: p2Losses,
        rating_points: p2Rating
      })
    ]);
  } catch (err) {
    error('Ошибка обновления статистики игроков:', err);
  }
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
          auditGallery.mediaUpload(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)));
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
      auditGallery.uploadError(err);
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
  const record = /** @type {GalleryRecord} */ (await pb.collection('gallery').create(data));
  auditGallery.mediaUpload(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)));
  return record;
}

/** @param {GalleryRecord[]} records */
export function logGalleryBatchUpload(records) {
  if (!Array.isArray(records) || records.length < 2) return;
  auditGallery.mediaBatchUpload(
    records.map((record) => /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)))
  );
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
    const result = await pb.collection('gallery').delete(imageId);
    auditGallery.mediaDelete(imageId);
    return result;
  } catch (err) {
    relatedDeleteResults
      .filter((result) => result.status === 'rejected')
      .forEach((result) => error('delete gallery related records:', result.reason));
    auditGallery.deleteError(err, imageId);
    throw err;
  }
}

/** @param {string[]} ids */
export async function deleteGalleryImages(ids) {
  const results = await Promise.all(ids.map((imageId) => deleteGalleryImage(imageId)));
  auditGallery.mediaBatchDelete(ids);
  return results;
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
    auditGallery.likeRemove(mediaId);
    return null;
  }

  const record = /** @type {GalleryLikeRecord} */ (await pb.collection('gallery_likes').create({
    media_id: mediaId,
    user: userId
  }));
  auditGallery.likeAdd(mediaId);
  return record;
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

  const record = /** @type {GalleryCommentRecord} */ (await pb.collection('gallery_comments').create({
    media_id: mediaId,
    author: authorId,
    text
  }, { expand: 'author' }));
  auditGallery.commentCreate(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (record)), mediaId);
  return record;
}

/**
 * @param {string} commentId
 * @param {string} [mediaId]
 */
export async function deleteGalleryComment(commentId, mediaId) {
  const comment = mediaId
    ? null
    : /** @type {GalleryCommentRecord} */ (
        await pb.collection('gallery_comments').getOne(commentId, { requestKey: null })
      );
  const result = await pb.collection('gallery_comments').delete(commentId);
  auditGallery.commentDelete(commentId, mediaId || comment?.media_id || '');
  return result;
}

/**
 * @param {string} commentId
 * @param {string} text
 * @param {string} [mediaId]
 */
export async function updateGalleryComment(commentId, text, mediaId) {
  const record = /** @type {GalleryCommentRecord} */ (
    await pb.collection('gallery_comments').update(commentId, { text })
  );
  auditGallery.commentEdit(commentId, mediaId || record.media_id || '', record.text);
  return record;
}

// --- ЗАКАЗЫ -----------------------------------------------------------------

/**
 * @param {{ user: string, items: OrderItemRecord[] }} payload
 * @returns {Promise<OrderRecord>}
 */
export async function createOrder(payload) {
  const record = /** @type {OrderRecord} */ (
    await pb.collection('orders').create({
      ...payload,
      status: 'pending'
    })
  );
  auditShop.orderCreate(record.id, Array.isArray(record.items) ? record.items.length : 0);
  return record;
}

/**
 * @param {{ userId?: string, status?: 'pending' | 'completed' | 'cancelled', signal?: AbortSignal }} [options]
 * @returns {Promise<OrderRecord[]>}
 */
export async function listOrders({ userId, status, signal } = {}) {
  try {
    const filters = [];
    if (userId) filters.push(pb.filter('user = {:userId}', { userId }));
    if (status) filters.push(pb.filter('status = {:status}', { status }));

    return /** @type {OrderRecord[]} */ (await pb.collection('orders').getFullList({
      sort: '-created',
      filter: filters.join(' && '),
      expand: 'user',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения заказов:', err);
    throw err;
  }
}

/**
 * @param {string} orderId
 * @param {'pending' | 'completed' | 'cancelled'} status
 * @returns {Promise<OrderRecord>}
 */
export async function updateOrderStatus(orderId, status) {
  const record = /** @type {OrderRecord} */ (
    await pb.collection('orders').update(orderId, { status })
  );
  auditShop.orderStatusChange(orderId, status);
  return record;
}

/**
 * @param {string} orderId
 * @param {number} itemIndex
 * @returns {Promise<OrderRecord>}
 */
export async function removeOrderItem(orderId, itemIndex) {
  const order = /** @type {OrderRecord} */ (
    await pb.collection('orders').getOne(orderId, { requestKey: null })
  );
  const items = Array.isArray(order.items) ? [...order.items] : [];
  const removed = items[itemIndex];
  if (!removed) {
    throw new Error(`Товар с индексом ${itemIndex} не найден в заказе ${orderId}`);
  }

  items.splice(itemIndex, 1);
  const record = /** @type {OrderRecord} */ (
    await pb.collection('orders').update(orderId, { items })
  );
  auditShop.orderItemRemoved(orderId, removed.productId);
  return record;
}

/** @param {string} orderId */
export async function deleteOrder(orderId) {
  const result = await pb.collection('orders').delete(orderId);
  auditShop.orderDeleted(orderId);
  return result;
}
