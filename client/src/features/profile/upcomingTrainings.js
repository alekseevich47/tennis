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
export function todayTomorrowKeys(now = new Date()) {
  const today = dayKey(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { today, tomorrow: dayKey(tomorrowDate) };
}

/** @param {number} n */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Бейдж расписания в ленте: сегодня → `чч:мм:сс`, завтра → «завтра».
 * @param {{ date?: string } | null | undefined} training
 * @param {Date} [now]
 * @returns {{ label: string, kind: 'today' | 'tomorrow' } | null}
 */
export function formatFeedScheduleBadge(training, now = new Date()) {
  if (!training?.date) return null;
  const { today, tomorrow } = todayTomorrowKeys(now);
  const key = dayKey(training.date);
  if (key === tomorrow) {
    return { label: 'завтра', kind: 'tomorrow' };
  }
  if (key !== today) return null;

  const diffMs = Math.max(0, new Date(training.date).getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return {
    label: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
    kind: 'today'
  };
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
