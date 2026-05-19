// @ts-check
import pb from './pb';
import { error } from '../lib/log';

/**
 * @typedef {Object} TrainingRecord
 * @property {string} id
 * @property {string} collectionId
 * @property {string} collectionName
 * @property {string} date
 * @property {number} [duration]
 * @property {'group' | 'tournament'} [type]
 * @property {number | null} [max_slots]
 * @property {string} [location]
 * @property {string} [description]
 * @property {string[]} [booked_users]
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<TrainingRecord[]>}
 */
export async function listTrainings({ signal } = {}) {
  try {
    return /** @type {TrainingRecord[]} */ (await pb.collection('trainings').getFullList({
      sort: 'date',
      expand: 'booked_users',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки расписания:', err);
    throw err;
  }
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function createTraining(payload) {
  return pb.collection('trainings').create(payload);
}

/**
 * @param {string} trainingId
 * @param {Record<string, unknown>} patch
 */
export async function updateTraining(trainingId, patch) {
  return pb.collection('trainings').update(trainingId, patch);
}

/**
 * @param {string} trainingId
 */
export async function deleteTraining(trainingId) {
  return pb.collection('trainings').delete(trainingId);
}

/**
 * Записать пользователя на тренировку.
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function bookTraining(training, userId) {
  if (!userId) throw new Error('Не авторизован');
  const current = training.booked_users || [];
  if (current.includes(userId)) throw new Error('Вы уже записаны на эту тренировку');
  if (training.max_slots && current.length >= training.max_slots) {
    throw new Error('Нет свободных мест');
  }
  return pb.collection('trainings').update(training.id, {
    booked_users: [...current, userId]
  });
}

/**
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function cancelTrainingBooking(training, userId) {
  const current = training.booked_users || [];
  return pb.collection('trainings').update(training.id, {
    booked_users: current.filter((id) => id !== userId)
  });
}
