// @ts-check
import { dayKey, hasTimeRangeEnded } from '../../lib/format';

/**
 * Будущая запись: пользователь в booked_users, тренировка не удалена/не отменена
 * и ещё не началась.
 * @param {any} training
 * @param {string} userId
 * @param {Date} [now]
 */
export function isFutureBookedTraining(training, userId, now = new Date()) {
  if (!userId || !training) return false;
  if (training.is_deleted === true || training.is_cancelled === true) return false;
  const booked = training.booked_users || [];
  if (!booked.includes(userId)) return false;
  return new Date(training.date).getTime() > now.getTime();
}

/**
 * Число будущих тренировок, на которые записан пользователь.
 * @param {any[] | null | undefined} trainings
 * @param {string} userId
 * @param {Date} [now]
 */
export function countUpcomingBookings(trainings, userId, now = new Date()) {
  if (!userId || !Array.isArray(trainings)) return 0;
  return trainings.filter((t) => isFutureBookedTraining(t, userId, now)).length;
}

/**
 * @param {Date} [now]
 * @returns {{ today: string, tomorrow: string }}
 */
function todayTomorrowKeys(now = new Date()) {
  const today = dayKey(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { today, tomorrow: dayKey(tomorrowDate) };
}

/**
 * Записи на сегодня и завтра (ещё не завершённые), отсортированные по дате ↑.
 * @param {any[] | null | undefined} trainings
 * @param {string} userId
 * @param {Date} [now]
 */
export function getTodayTomorrowBookings(trainings, userId, now = new Date()) {
  if (!userId || !Array.isArray(trainings)) return [];
  const { today, tomorrow } = todayTomorrowKeys(now);
  return trainings
    .filter((training) => {
      if (training.is_deleted === true || training.is_cancelled === true) return false;
      const booked = training.booked_users || [];
      if (!booked.includes(userId)) return false;
      if (hasTimeRangeEnded(training.date, training.duration || 0, now)) return false;
      const key = dayKey(training.date);
      return key === today || key === tomorrow;
    })
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
