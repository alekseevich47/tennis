// @ts-check
import { normalizeProductCategoryIds } from './productCategories';

/** @typedef {'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest' | 'popular'} ShopSortMode */

/**
 * @typedef {{
 *   categoryId: string,
 *   priceMin: number | null,
 *   priceMax: number | null,
 *   sort: ShopSortMode
 * }} ShopFiltersState
 */

/** @type {ShopFiltersState} */
export const DEFAULT_SHOP_FILTERS = {
  categoryId: '',
  priceMin: null,
  priceMax: null,
  sort: 'popular'
};

/**
 * @param {Array<{ price?: number }>} products
 * @returns {{ min: number, max: number }}
 */
export function getPriceBounds(products) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const product of products) {
    const price = Number(product?.price);
    if (!Number.isFinite(price) || price < 0) continue;
    if (price < min) min = price;
    if (price > max) max = price;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }
  if (min === max) {
    return { min: Math.max(0, min), max: Math.max(0, max) };
  }
  return { min: Math.floor(min), max: Math.ceil(max) };
}

/**
 * @param {ShopFiltersState} filters
 * @param {{ min: number, max: number }} bounds
 */
export function resolvePriceRange(filters, bounds) {
  const lo = filters.priceMin == null ? bounds.min : filters.priceMin;
  const hi = filters.priceMax == null ? bounds.max : filters.priceMax;
  return {
    min: Math.min(lo, hi),
    max: Math.max(lo, hi)
  };
}

/**
 * @param {ShopFiltersState} filters
 * @param {{ min: number, max: number }} bounds
 */
export function countActiveShopFilters(filters, bounds) {
  let count = 0;
  // categoryId — только через CategoryDropdown в шапке, в badge шторки не входит

  const range = resolvePriceRange(filters, bounds);
  const priceNarrowed =
    bounds.max > bounds.min &&
    (range.min > bounds.min || range.max < bounds.max);
  if (priceNarrowed) count += 1;

  if (filters.sort && filters.sort !== DEFAULT_SHOP_FILTERS.sort) count += 1;
  return count;
}

/**
 * @param {import('../../services/catalog').ProductRecord} product
 * @param {ShopFiltersState} filters
 * @param {{ min: number, max: number }} bounds
 */
export function productMatchesFilters(product, filters, bounds) {
  if (filters.categoryId) {
    const ids = normalizeProductCategoryIds(product?.categories);
    if (!ids.includes(filters.categoryId)) return false;
  }

  const price = Number(product?.price) || 0;
  const range = resolvePriceRange(filters, bounds);
  if (price < range.min || price > range.max) return false;
  return true;
}

/**
 * Один режим сортировки: название XOR цена XOR новизна XOR популярность.
 * @param {import('../../services/catalog').ProductRecord[]} products
 * @param {ShopSortMode | Pick<ShopFiltersState, 'sort'>} sortOrFilters
 */
export function sortProducts(products, sortOrFilters) {
  const sort =
    typeof sortOrFilters === 'string'
      ? sortOrFilters
      : sortOrFilters?.sort || DEFAULT_SHOP_FILTERS.sort;

  const next = [...products];
  const byTitle = (a, b) =>
    String(a.title || '').localeCompare(String(b.title || ''), 'ru', {
      sensitivity: 'base',
      numeric: true
    });
  const byPrice = (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0);
  const byCreated = (a, b) =>
    new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
  const byViews = (a, b) => {
    const viewsDiff = (Number(b.views) || 0) - (Number(a.views) || 0);
    if (viewsDiff !== 0) return viewsDiff;
    return byCreated(a, b);
  };

  switch (sort) {
    case 'name_asc':
      next.sort(byTitle);
      break;
    case 'name_desc':
      next.sort((a, b) => byTitle(b, a));
      break;
    case 'price_asc':
      next.sort(byPrice);
      break;
    case 'price_desc':
      next.sort((a, b) => byPrice(b, a));
      break;
    case 'newest':
      next.sort(byCreated);
      break;
    case 'popular':
    default:
      next.sort(byViews);
      break;
  }
  return next;
}
