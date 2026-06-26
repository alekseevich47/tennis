// @ts-check
// Чистые форматтеры дат/времени. Hoisted из компонентов (H12).

export const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export const DAYS_FULL = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота'
];

export const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

/** @param {number} n */
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * `15:42 05.11.2025` — основной формат поста/коммента.
 * @param {string | number | Date} dateLike
 */
export function formatPostDate(dateLike) {
  const d = new Date(dateLike);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * `Понедельник, 5 ноября` — заголовок карточки тренировки.
 * @param {string | number | Date} dateLike
 */
export function formatCardDate(dateLike) {
  const d = new Date(dateLike);
  return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
}

/**
 * `18:00 - 19:30` — диапазон тренировки по дате старта + длительности (мин).
 * @param {string | number | Date} dateLike
 * @param {number} durationMin
 */
export function formatTimeRange(dateLike, durationMin) {
  const start = new Date(dateLike);
  const end = new Date(start.getTime() + (durationMin || 0) * 60_000);
  return `${pad2(start.getHours())}:${pad2(start.getMinutes())} - ${pad2(end.getHours())}:${pad2(end.getMinutes())}`;
}

/**
 * Проверяет, закончился ли временной диапазон тренировки.
 * @param {string | number | Date} dateLike
 * @param {number} durationMin
 * @param {Date} [now]
 */
export function hasTimeRangeEnded(dateLike, durationMin, now = new Date()) {
  const start = new Date(dateLike);
  const end = new Date(start.getTime() + (durationMin || 0) * 60_000);
  return end < now;
}

/**
 * Можно ли снять запись самостоятельно (не позднее чем за 1 час до начала).
 * @param {{ date: string | number | Date }} training
 * @param {Date} [now]
 */
export function canCancelBooking(training, now = new Date()) {
  return new Date(training.date).getTime() - now.getTime() > 60 * 60 * 1000;
}

/**
 * `5 ноября, 18:00` — для карточки матча в соревнованиях.
 * @param {string | number | Date} dateLike
 */
export function formatDateTimeShort(dateLike) {
  const d = new Date(dateLike);
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Унифицированный ключ дня для индексирования (H9, H13).
 * @param {Date | string | number} dateLike
 */
export function dayKey(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * @param {Date} a
 * @param {Date} b
 */
export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Сгенерировать N дней начиная с сегодня.
 * @param {number} count
 * @returns {Date[]}
 */
export function generateNextDays(count = 14) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const next = new Date(today);
    next.setDate(today.getDate() + i);
    out.push(next);
  }
  return out;
}

export function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
