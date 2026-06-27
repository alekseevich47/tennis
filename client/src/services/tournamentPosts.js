// @ts-check
import { mutate } from 'swr';
import pb from './pb';
import { getCurrentUser } from './auth';
import { error } from '../lib/log';

/**
 * @typedef {{ userId: string, fullName: string, points: number, place: number }} TournamentParticipant
 */

/**
 * @typedef {Object} TournamentPostRecord
 * @property {string} id
 * @property {string} [content]
 * @property {string | string[]} [media]
 * @property {string} [author]
 * @property {TournamentParticipant[]} [participants]
 * @property {string} created
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
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<TournamentPostRecord[]>}
 */
export async function listTournamentPosts({ signal } = {}) {
  try {
    return /** @type {TournamentPostRecord[]} */ (await pb.collection('tournament_posts').getFullList({
      sort: '-created',
      expand: 'tournament_comments(post)',
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
 * @param {{
 *   content: string,
 *   files?: File[],
 *   rawParticipants: Array<{ userId: string, fullName: string, points: number }>
 * }} params
 * @returns {Promise<TournamentPostRecord>}
 */
export async function publishTournamentPost({ content, files = [], rawParticipants }) {
  const author = getCurrentUser();
  if (!author?.id) {
    throw new Error('Не авторизован: нельзя опубликовать итоги турнира');
  }

  const participants = rankParticipants(rawParticipants);
  const formData = new FormData();
  formData.append('content', content.trim());
  formData.append('author', author.id);
  formData.append('participants', JSON.stringify(participants));
  files.forEach((file) => formData.append('media', file));

  const record = /** @type {TournamentPostRecord} */ (
    await pb.collection('tournament_posts').create(formData)
  );

  await Promise.allSettled(
    participants.map((participant) =>
      pb.collection('users').update(participant.userId, { 'rating_points+': participant.points })
    )
  );

  invalidateTournamentCaches();
  return record;
}
