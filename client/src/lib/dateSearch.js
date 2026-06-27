// @ts-check

/** @typedef {{ day: number | null, month: number | null, year: number | null }} DateQueryParts */

const MONTH_ENTRIES = [
  { month: 1, tokens: ['январь', 'января', 'янв'] },
  { month: 2, tokens: ['февраль', 'февраля', 'фев'] },
  { month: 3, tokens: ['март', 'марта', 'мар'] },
  { month: 4, tokens: ['апрель', 'апреля', 'апр'] },
  { month: 5, tokens: ['май', 'мая'] },
  { month: 6, tokens: ['июнь', 'июня', 'июн'] },
  { month: 7, tokens: ['июль', 'июля', 'июл'] },
  { month: 8, tokens: ['август', 'августа', 'авг'] },
  { month: 9, tokens: ['сентябрь', 'сентября', 'сент', 'сен'] },
  { month: 10, tokens: ['октябрь', 'октября', 'окт'] },
  { month: 11, tokens: ['ноябрь', 'ноября', 'нояб', 'ноя'] },
  { month: 12, tokens: ['декабрь', 'декабря', 'дек'] }
];

const EMPTY_QUERY = /** @type {DateQueryParts} */ ({ day: null, month: null, year: null });

/**
 * @param {string} text
 * @returns {number | null} month 1–12
 */
function findRussianMonth(text) {
  const lower = text.toLowerCase();
  for (const entry of MONTH_ENTRIES) {
    const sorted = [...entry.tokens].sort((a, b) => b.length - a.length);
    for (const token of sorted) {
      if (lower.includes(token)) return entry.month;
    }
  }
  return null;
}

/**
 * @param {string} text
 * @returns {DateQueryParts | null}
 */
function parseRussianDate(text) {
  const month = findRussianMonth(text);
  if (month == null) return null;

  /** @type {DateQueryParts} */
  const result = { day: null, month, year: null };

  let remainder = text.toLowerCase();
  for (const entry of MONTH_ENTRIES) {
    if (entry.month !== month) continue;
    for (const token of entry.tokens) {
      remainder = remainder.replaceAll(token, ' ');
    }
  }

  const numbers = remainder.match(/\d+/g);
  if (!numbers) return result;

  for (const num of numbers) {
    const n = parseInt(num, 10);
    if (num.length === 4 && n >= 1000 && n <= 9999) {
      result.year = n;
    } else if (n >= 1 && n <= 31 && result.day == null) {
      result.day = n;
    }
  }

  return result;
}

/**
 * @param {string} text
 * @returns {DateQueryParts | null}
 */
function parseNumericDate(text) {
  const normalized = text.trim().replace(/[./]/g, ' ');
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  if (parts.some((p) => !/^\d+$/.test(p))) return null;

  const nums = parts.map((p) => parseInt(p, 10));

  if (nums.length === 1) {
    const n = nums[0];
    if (n >= 1000 && n <= 9999) return { day: null, month: null, year: n };
    if (n >= 1 && n <= 31) return { day: n, month: null, year: null };
    return null;
  }

  if (nums.length === 2) {
    const [a, b] = nums;
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
      return { day: a, month: b, year: null };
    }
    return null;
  }

  if (nums.length === 3) {
    const [a, b, c] = nums;
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12 && c >= 1000 && c <= 9999) {
      return { day: a, month: b, year: c };
    }
  }

  return null;
}

/**
 * Парсит строку поиска по дате.
 * @param {string} query
 * @returns {DateQueryParts}
 */
export function parseDateQuery(query) {
  if (!query || !query.trim()) return { ...EMPTY_QUERY };

  const trimmed = query.trim();
  return parseRussianDate(trimmed) ?? parseNumericDate(trimmed) ?? { ...EMPTY_QUERY };
}

/**
 * @param {DateQueryParts} parsed
 * @returns {boolean}
 */
export function isDateQueryParsed(parsed) {
  return parsed.day != null || parsed.month != null || parsed.year != null;
}

/**
 * @param {string | number | Date} dateLike
 * @param {DateQueryParts} parsed
 * @returns {boolean}
 */
export function matchesDateQuery(dateLike, parsed) {
  if (!isDateQueryParsed(parsed)) return false;

  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;

  if (parsed.day != null && d.getDate() !== parsed.day) return false;
  if (parsed.month != null && d.getMonth() + 1 !== parsed.month) return false;
  if (parsed.year != null && d.getFullYear() !== parsed.year) return false;

  return true;
}
