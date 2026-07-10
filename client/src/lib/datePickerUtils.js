export function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateInputValue(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toSelectedRange(range) {
  if (!range?.start) return undefined;
  const from = parseDateInputValue(range.start);
  const to = range.end ? parseDateInputValue(range.end) : undefined;
  return { from, to };
}

export function formatDateForSearch(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/** YYYY-MM-DD → dd.mm.yyyy */
export function formatDateDisplay(value) {
  if (!value) return '';
  const date = parseDateInputValue(value.slice(0, 10));
  if (Number.isNaN(date.getTime())) return '';
  return formatDateForSearch(date);
}

/** Диапазон YYYY-MM-DD → «dd.mm.yyyy - dd.mm.yyyy» */
export function formatDateRangeDisplay(start, end) {
  const startText = formatDateDisplay(start);
  if (!startText) return '';
  const endText = formatDateDisplay(end || start);
  if (!endText || endText === startText) return startText;
  return `${startText} - ${endText}`;
}

function isValidYearPrefix(value) {
  const len = value.length;
  if (len === 0) return true;
  if (len === 1) return value === '1' || value === '2';
  if (len === 2) {
    if (value === '19') return true;
    return value[0] === '2' && value[1] >= '0';
  }
  if (len === 3) {
    const n = Number.parseInt(value, 10);
    return n >= 190 && n <= 299;
  }
  if (len === 4) {
    const n = Number.parseInt(value, 10);
    return n >= 1900;
  }
  return false;
}

function consumeDay(digits, start) {
  if (start >= digits.length) return { segment: '', next: start };

  const d1 = digits[start];

  if (d1 > '3') {
    if (d1 === '0') return { segment: '', next: start };
    return { segment: `0${d1}`, next: start + 1 };
  }

  if (start + 1 >= digits.length) {
    return { segment: d1, next: start + 1 };
  }

  const d2 = digits[start + 1];
  const dayNum = Number.parseInt(d1 + d2, 10);
  if (dayNum < 1 || dayNum > 31) {
    return { segment: d1, next: start + 1 };
  }

  return { segment: d1 + d2, next: start + 2 };
}

function consumeMonth(digits, start) {
  if (start >= digits.length) return { segment: '', next: start };

  const m1 = digits[start];

  if (m1 > '1') {
    if (m1 === '0') return { segment: '', next: start };
    const monthNum = Number.parseInt(`0${m1}`, 10);
    if (monthNum < 1 || monthNum > 12) return { segment: '', next: start };
    return { segment: `0${m1}`, next: start + 1 };
  }

  if (start + 1 >= digits.length) {
    return { segment: m1, next: start + 1 };
  }

  const m2 = digits[start + 1];
  const monthNum = Number.parseInt(m1 + m2, 10);
  if (monthNum < 1 || monthNum > 12) {
    return { segment: m1, next: start + 1 };
  }

  return { segment: m1 + m2, next: start + 2 };
}

function consumeYear(digits, start) {
  let year = '';
  let idx = start;

  while (idx < digits.length && year.length < 4) {
    const candidate = year + digits[idx];
    if (!isValidYearPrefix(candidate)) break;
    year = candidate;
    idx += 1;
  }

  return { segment: year, next: idx };
}

/** Цифры → дд.мм.гггг с авто-точками и проверкой сегментов при вводе */
export function maskDateInputFromDigits(digits) {
  const clean = String(digits).replace(/\D/g, '').slice(0, 8);
  if (!clean) return '';

  const { segment: day, next: afterDay } = consumeDay(clean, 0);
  if (!day) return '';
  if (day.length < 2) return day;
  if (afterDay >= clean.length) return day;

  const { segment: month, next: afterMonth } = consumeMonth(clean, afterDay);
  if (!month) return `${day}.`;
  let result = `${day}.${month}`;
  if (month.length < 2) return result;
  if (afterMonth >= clean.length) return result;

  const { segment: year } = consumeYear(clean, afterMonth);
  if (!year) return `${result}.`;
  return `${result}.${year}`;
}

/** Текст → дд.мм.гггг (буквы отбрасываются) */
export function maskDateInput(value) {
  return maskDateInputFromDigits(String(value).replace(/\D/g, ''));
}

/** Текст → дд.мм.гггг - дд.мм.гггг */
export function maskDateRangeInput(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 16);
  if (!digits) return '';

  const first = maskDateInputFromDigits(digits.slice(0, 8));
  if (digits.length <= 8) return first;

  const second = maskDateInputFromDigits(digits.slice(8));
  if (!second) return first;
  return `${first} - ${second}`;
}

/** dd.mm.yyyy → YYYY-MM-DD или null */
export function parseDateDisplay(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return toDateInputValue(date);
}

/** «dd.mm.yyyy - dd.mm.yyyy» → { start, end } (YYYY-MM-DD) или null */
export function parseDateRangeDisplay(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s*-\s*/);
  const start = parseDateDisplay(parts[0]);
  if (!start) return null;
  const end = parts.length > 1 ? parseDateDisplay(parts[1]) : start;
  if (parts.length > 1 && !end) return null;
  return { start, end: end || start };
}
