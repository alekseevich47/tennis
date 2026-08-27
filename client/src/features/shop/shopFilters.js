// @ts-check
import { normalizeProductCategoryIds } from './productCategories';

/** @typedef {'asc' | 'desc'} ShopSortDir */
/** @typedef {'newest' | 'popular' | null} ShopFeaturedSort */

/**
 * @typedef {{
 *   categoryId: string,
 *   priceMin: number | null,
 *   priceMax: number | null,
 *   nameDir: ShopSortDir | null,
 *   priceDir: ShopSortDir | null,
 *   featured: ShopFeaturedSort
 * }} ShopFiltersState
 */

/** @type {ShopFiltersState} */
export const DEFAULT_SHOP_FILTERS = {
  categoryId: '',
  priceMin: null,
  priceMax: null,
  nameDir: null,
  priceDir: null,
  featured: 'popular'
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
  if (filters.categoryId) count += 1;

  const range = resolvePriceRange(filters, bounds);
  const priceNarrowed =
    bounds.max > bounds.min &&
    (range.min > bounds.min || range.max < bounds.max);
  if (priceNarrowed) count += 1;

  if (filters.nameDir) count += 1;
  if (filters.priceDir) count += 1;
  if (filters.featured && filters.featured !== DEFAULT_SHOP_FILTERS.featured) count += 1;
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
 * Сортировка: featured (newest|popular) → nameDir → priceDir.
 * Name и price могут быть активны одновременно; newest/popular — взаимоисключающие.
 * @param {import('../../services/catalog').ProductRecord[]} products
 * @param {Pick<ShopFiltersState, 'nameDir' | 'priceDir' | 'featured'>} sort
 */
export function sortProducts(products, sort) {
  const nameDir = sort?.nameDir ?? null;
  const priceDir = sort?.priceDir ?? null;
  const featured = sort?.featured ?? null;
  const hasAny = Boolean(featured || nameDir || priceDir);

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

  return [...products].sort((a, b) => {
    if (featured === 'newest') {
      const d = byCreated(a, b);
      if (d !== 0) return d;
    } else if (featured === 'popular') {
      const d = byViews(a, b);
      if (d !== 0) return d;
    }

    if (nameDir === 'asc') {
      const d = byTitle(a, b);
      if (d !== 0) return d;
    } else if (nameDir === 'desc') {
      const d = byTitle(b, a);
      if (d !== 0) return d;
    }

    if (priceDir === 'asc') {
      const d = byPrice(a, b);
      if (d !== 0) return d;
    } else if (priceDir === 'desc') {
      const d = byPrice(b, a);
      if (d !== 0) return d;
    }

    if (!hasAny) return byViews(a, b);
    return 0;
  });
}
