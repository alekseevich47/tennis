/**
 * @typedef {{ name: string, value: string }} ProductParameter
 */

/**
 * @param {unknown} raw
 * @returns {ProductParameter[]}
 */
export function parseProductParameters(raw) {
  if (!raw) return [];
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: String(item?.name ?? '').trim(),
      value: String(item?.value ?? '').trim()
    }))
    .filter((item) => item.name || item.value);
}

/**
 * @param {ProductParameter[]} items
 * @returns {ProductParameter[]}
 */
export function normalizeProductParameters(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      name: String(item?.name ?? '').trim(),
      value: String(item?.value ?? '').trim()
    }))
    .filter((item) => item.name || item.value);
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseProductColors(raw) {
  if (!raw) return [];
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim().toUpperCase())
    .filter(Boolean);
}

/**
 * @param {unknown} mode
 * @returns {'' | 'color' | 'size'}
 */
export function normalizeVariantMode(mode) {
  if (mode === 'color' || mode === 'size') return mode;
  return '';
}

/**
 * @param {ProductParameter[]} items
 * @returns {string}
 */
export function serializeProductParameters(items) {
  return JSON.stringify(normalizeProductParameters(items));
}

/**
 * @param {string[]} colors
 * @returns {string}
 */
export function serializeProductColors(colors) {
  return JSON.stringify(
    (Array.isArray(colors) ? colors : [])
      .map((item) => String(item ?? '').trim().toUpperCase())
      .filter(Boolean)
  );
}

/**
 * @param {ProductParameter[]} left
 * @param {ProductParameter[]} right
 * @returns {boolean}
 */
export function areProductParametersEqual(left, right) {
  const a = normalizeProductParameters(left);
  const b = normalizeProductParameters(right);
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.name === b[index].name && item.value === b[index].value);
}

/**
 * @param {string[]} left
 * @param {string[]} right
 * @returns {boolean}
 */
export function areProductColorsEqual(left, right) {
  const a = parseProductColors(left);
  const b = parseProductColors(right);
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}
