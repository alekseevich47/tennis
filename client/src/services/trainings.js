// @ts-check
import pb from './pb';
import { isModerator } from './auth';
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
 * @property {boolean} [is_deleted]
 * @property {boolean} [is_closed]
 * @property {string[]} [booked_users]
 * @property {string[]} [attended_users]
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
      filter: isModerator() ? '' : 'is_deleted != true',
      expand: 'booked_users,attended_users',
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
 * @param {string} trainingId
 */
export async function softDeleteTraining(trainingId) {
  return pb.collection('trainings').update(trainingId, { is_deleted: true });
}

/**
 * @param {string} trainingId
 */
export async function restoreTraining(trainingId) {
  return pb.collection('trainings').update(trainingId, { is_deleted: false });
}

/**
 * @param {string} trainingId
 */
export async function closeTraining(trainingId) {
  return pb.collection('trainings').update(trainingId, { is_closed: true });
}

/**
 * @param {string} trainingId
 */
export async function reopenTraining(trainingId) {
  return pb.collection('trainings').update(trainingId, { is_closed: false });
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
 * Записать произвольного пользователя на тренировку.
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function bookUserToTraining(training, userId) {
  if (!userId) throw new Error('Не выбран пользователь');
  const current = training.booked_users || [];
  if (current.includes(userId)) throw new Error('Игрок уже записан на эту тренировку');
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

/**
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function markAttendance(training, userId) {
  if (!userId) throw new Error('Не выбран пользователь');
  const current = training.attended_users || [];
  if (current.includes(userId)) return training;
  return pb.collection('trainings').update(training.id, {
    attended_users: [...current, userId]
  });
}

/**
 * @param {TrainingRecord} training
 * @param {string} userId
 */
export async function unmarkAttendance(training, userId) {
  const current = training.attended_users || [];
  return pb.collection('trainings').update(training.id, {
    attended_users: current.filter((id) => id !== userId)
  });
}
