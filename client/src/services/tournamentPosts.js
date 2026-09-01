// @ts-check
import { mutate } from 'swr';
import pb from './pb';
import { getCurrentUser } from './auth';
import { error } from '../lib/log';
import { prepareUploadMediaList } from '../lib/prepareUploadMedia';
import { PB_URL } from '../config';

/**
 * @typedef {{ userId: string, fullName: string, points: number, place: number }} TournamentParticipant
 */

/**
 * @typedef {Object} TournamentPostRecord
 * @property {string} id
 * @property {string} [content]
 * @property {string | string[]} [media]
 * @property {Array<{ source?: string, publicUrl: string, name?: string, mediaType?: 'image' | 'video', type?: 'file' | 'album' }> | null} [external_media]
 * @property {string} [author]
 * @property {TournamentParticipant[]} [participants]
 * @property {number} [post_number]
 * @property {boolean} [is_deleted]
 * @property {boolean} [is_pinned]
 * @property {boolean} [is_scheduled]
 * @property {string | null} [scheduled_at]
 * @property {boolean} [caption_above]
 * @property {string | null} [pinned_at]
 * @property {string} created
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @param {Array<{ userId: string, fullName: string, points: number }>} rawParticipants
 * @returns {TournamentParticipant[]}
 */
function rankParticipants(rawParticipants) {
  const sorted = [...rawParticipants].sort((a, b) => b.points - a.points);
  let previousPoints = null;
  let previousPlace = 0;

  return sorted.map((participant, index) => {
    const place = participant.points === previousPoints ? previousPlace : index + 1;
    previousPoints = participant.points;
    previousPlace = place;
    return {
      userId: participant.userId,
      fullName: participant.fullName,
      points: participant.points,
      place
    };
  });
}

function invalidateTournamentCaches() {
  mutate((key) => Array.isArray(key) && key[0] === 'tournament_posts');
  mutate((key) => Array.isArray(key) && key[0] === 'players');
}

/**
 * @param {{ includeDeleted?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<TournamentPostRecord[]>}
 */
export async function listTournamentPosts({ includeDeleted = false, signal } = {}) {
  try {
    const base = includeDeleted ? '' : '(is_deleted = false || is_deleted = null)';
    const scheduled = 'is_scheduled != true';
    const filter = base ? `(${base}) && (${scheduled})` : scheduled;
    return /** @type {TournamentPostRecord[]} */ (await pb.collection('tournament_posts').getFullList({
      sort: '-created',
      filter,
      expand: 'tournament_comments(post),tournament_comments(post).author',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки турнирных постов:', err);
    throw err;
  }
}

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<TournamentPostRecord[]>}
 */
export async function listScheduledTournamentPosts({ signal } = {}) {
  try {
    return /** @type {TournamentPostRecord[]} */ (
      await pb.collection('tournament_posts').getFullList({
        sort: 'scheduled_at',
        filter: 'is_scheduled = true && is_deleted != true',
        requestKey: null,
        signal
      })
    );
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки запланированных турнирных постов:', err);
    throw err;
  }
}

/**
 * @param {string} id
 * @param {string} scheduledAtIso
 */
export async function rescheduleTournamentPost(id, scheduledAtIso) {
  return /** @type {TournamentPostRecord} */ (
    await pb.collection('tournament_posts').update(id, {
      scheduled_at: scheduledAtIso,
      is_scheduled: true
    })
  );
}

/**
 * @param {string} id
 */
export async function publishScheduledTournamentPostNow(id) {
  return /** @type {TournamentPostRecord} */ (
    await pb.collection('tournament_posts').update(id, { is_scheduled: false })
  );
}

/**
 * @param {string} id
 */
export async function deleteScheduledTournamentPost(id) {
  return /** @type {TournamentPostRecord} */ (
    await pb.collection('tournament_posts').update(id, {
      is_deleted: true,
      is_scheduled: false
    })
  );
}

/**
 * @param {string} id
 * @param {Record<string, unknown> | FormData} data
 * @returns {Promise<TournamentPostRecord>}
 */
export async function updateTournamentPost(id, data) {
  const record = /** @type {TournamentPostRecord} */ (
    await pb.collection('tournament_posts').update(id, data)
  );
  invalidateTournamentCaches();
  return record;
}

/**
 * @param {string} id
 * @returns {Promise<TournamentPostRecord>}
 */
export async function pinTournamentPost(id) {
  return updateTournamentPost(id, { is_pinned: true, pinned_at: new Date().toISOString() });
}

/**
 * @param {string} id
 * @returns {Promise<TournamentPostRecord>}
 */
export async function unpinTournamentPost(id) {
  return updateTournamentPost(id, { is_pinned: false, pinned_at: null });
}

/**
 * @param {string} id
 * @returns {Promise<TournamentPostRecord>}
 */
export async function softDeleteTournamentPost(id) {
  return updateTournamentPost(id, { is_deleted: true });
}

/**
 * @param {string} id
 */
export async function hardDeleteTournamentPost(id) {
  const result = await pb.collection('tournament_posts').delete(id);
  invalidateTournamentCaches();
  return result;
}

/**
 * Зомби soft-delete tournament_posts после незавершённого flush.
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function purgeAbandonedTournamentPosts({ signal } = {}) {
  const abandoned = /** @type {TournamentPostRecord[]} */ (
    await pb.collection('tournament_posts').getFullList({
      filter: 'is_deleted = true',
      requestKey: null,
      signal
    })
  );
  await Promise.all(
    abandoned.map((p) =>
      hardDeleteTournamentPost(p.id).catch((err) => error('purge tournament post:', err))
    )
  );
  return abandoned;
}

/**
 * @param {{
 *   content: string,
 *   files?: File[],
 *   externalMedia?: unknown,
 *   rawParticipants: Array<{ userId: string, fullName: string, points: number }>,
 *   scheduledAt?: string | null,
 *   captionAbove?: boolean
 * }} params
 * @returns {{ formData: FormData, participants: TournamentParticipant[], isScheduled: boolean }}
 */
function buildTournamentPostPayload({
  content,
  files = [],
  externalMedia,
  rawParticipants,
  scheduledAt = null,
  captionAbove = true
}) {
  const author = getCurrentUser();
  if (!author?.id) {
    throw new Error('Не авторизован: нельзя опубликовать итоги турнира');
  }

  const participants = rankParticipants(rawParticipants);
  const formData = new FormData();
  formData.append('content', content.trim());
  formData.append('author', author.id);
  formData.append('participants', JSON.stringify(participants));
  formData.append('external_media', JSON.stringify(externalMedia || []));
  formData.append('caption_above', captionAbove ? 'true' : 'false');
  const isScheduled = Boolean(scheduledAt);
  if (isScheduled) {
    formData.append('is_scheduled', 'true');
    formData.append('scheduled_at', scheduledAt);
  }
  files.forEach((file) => formData.append('media', file));

  return { formData, participants, isScheduled };
}

/**
 * @param {TournamentParticipant[]} participants
 */
async function applyTournamentPostSideEffects(participants) {
  await Promise.allSettled(
    participants.map((participant) =>
      pb.collection('users').update(participant.userId, { 'rating_points+': participant.points })
    )
  );
  invalidateTournamentCaches();
}

/**
 * @param {{
 *   content: string,
 *   files?: File[],
 *   externalMedia?: unknown,
 *   rawParticipants: Array<{ userId: string, fullName: string, points: number }>
 * }} params
 * @returns {Promise<TournamentPostRecord>}
 */
export async function publishTournamentPost(params) {
  const { formData, participants, isScheduled } = buildTournamentPostPayload(params);
  const record = /** @type {TournamentPostRecord} */ (
    await pb.collection('tournament_posts').create(formData)
  );
  if (!isScheduled) {
    await applyTournamentPostSideEffects(participants);
  } else {
    invalidateTournamentCaches();
  }
  return record;
}

/**
 * @param {{
 *   content: string,
 *   files?: File[],
 *   externalMedia?: unknown,
 *   rawParticipants: Array<{ userId: string, fullName: string, points: number }>,
 *   scheduledAt?: string | null,
 *   captionAbove?: boolean
 * }} params
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<TournamentPostRecord>}
 */
export async function publishTournamentPostWithProgress(params, { signal, onProgress } = {}) {
  const preparedFiles = params.files?.length
    ? await prepareUploadMediaList(params.files)
    : params.files;

  const { formData, participants, isScheduled } = buildTournamentPostPayload({
    ...params,
    files: preparedFiles
  });

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

    xhr.open('POST', `${PB_URL}/api/collections/tournament_posts/records`);
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
          const record = /** @type {TournamentPostRecord} */ (JSON.parse(xhr.responseText));
          const finish = isScheduled
            ? Promise.resolve().then(() => {
                invalidateTournamentCaches();
                return record;
              })
            : applyTournamentPostSideEffects(participants).then(() => record);
          finish.then(resolve).catch(reject);
        } catch (parseErr) {
          reject(parseErr);
        }
        return;
      }
      reject(new Error(`Не удалось опубликовать итоги турнира (${xhr.status})`));
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
    xhr.send(formData);
  });
}
