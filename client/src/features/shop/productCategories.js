// @ts-check

/**
 * `products.categories` — relation с maxSelect:1 → PB отдаёт строку id,
 * не массив. Expand / legacy multi → object | string[].
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeProductCategoryIds(raw) {
  if (raw == null || raw === '') return [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item == null || item === '') continue;
      if (typeof item === 'object' && /** @type {{ id?: unknown }} */ (item).id) {
        return [String(/** @type {{ id: unknown }} */ (item).id)];
      }
      return [String(item)];
    }
    return [];
  }

  if (typeof raw === 'object' && /** @type {{ id?: unknown }} */ (raw).id) {
    return [String(/** @type {{ id: unknown }} */ (raw).id)];
  }

  return [String(raw)];
}
