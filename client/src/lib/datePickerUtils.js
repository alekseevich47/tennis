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

/** dd.mm.yyyy → YYYY-MM-DD или null */
export function parseDateDisplay(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
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
