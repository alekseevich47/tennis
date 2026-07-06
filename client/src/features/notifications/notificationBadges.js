import { hasTimeRangeEnded, pluralize } from '../../lib/format';

/**
 * @param {number} value
 * @param {string} one
 * @param {string} few
 * @param {string} many
 */
function formatCountdownPart(value, one, few, many) {
  if (value <= 0) return '';
  return `${value} ${pluralize(value, one, few, many)}`;
}

/**
 * @param {string[] | Array<{ id?: string }>} bookedUsers
 * @param {string} userId
 */
function isUserBooked(bookedUsers, userId) {
  if (!userId || !Array.isArray(bookedUsers)) return true;
  return bookedUsers.some((entry) => {
    const id = typeof entry === 'string' ? entry : entry?.id;
    return id === userId;
  });
}

/**
 * Динамический бейдж обратного отсчёта до тренировки (TASKS_35 §3.3.3).
 * @param {{ date: string, duration?: number, is_cancelled?: boolean, is_deleted?: boolean, booked_users?: string[] }} training
 * @param {Date} [now]
 * @param {string} [userId]
 */
export function formatTrainingCountdownBadge(training, now = new Date(), userId) {
  if (!training) return null;

  if (training.is_cancelled || training.is_deleted || !isUserBooked(training.booked_users, userId)) {
    return 'Очень жаль, что не увиделись 😢';
  }

  const start = new Date(training.date);

  if (hasTimeRangeEnded(training.date, training.duration || 0, now)) {
    return 'Всё! Конец!';
  }

  if (start <= now) {
    return 'Уже идёт!';
  }

  const diffMs = start.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [
    formatCountdownPart(days, 'день', 'дня', 'дней'),
    formatCountdownPart(hours, 'час', 'часа', 'часов'),
    formatCountdownPart(minutes, 'минута', 'минуты', 'минут')
  ].filter(Boolean);

  if (parts.length === 0) {
    return 'Уже идёт!';
  }

  return `Осталось ${parts.join(' ')}`;
}
