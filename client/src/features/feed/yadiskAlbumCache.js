// @ts-check
/** Общий кэш развёрнутых альбомов Яндекс.Диска — card/detail/fullscreen шарят один список. */

/**
 * @typedef {{
 *   filename: string,
 *   url: string,
 *   thumbUrl?: string,
 *   previewUrl?: string,
 *   isVideo: boolean,
 *   originKey: string,
 *   publicUrl: string,
 *   path?: string | null,
 *   isLoading?: boolean
 * }} YadiskAlbumCacheItem
 */

/** @type {Map<string, YadiskAlbumCacheItem[]>} */
const cache = new Map();

/** @type {Set<(publicUrl: string, items: YadiskAlbumCacheItem[]) => void>} */
const listeners = new Set();

/**
 * @param {string} publicUrl
 * @param {YadiskAlbumCacheItem[]} items
 */
export function setYadiskAlbumCache(publicUrl, items) {
  if (!publicUrl) return;
  cache.set(publicUrl, items);
  listeners.forEach((fn) => {
    try {
      fn(publicUrl, items);
    } catch {
      // ignore subscriber errors
    }
  });
}

/**
 * @param {string} publicUrl
 * @returns {YadiskAlbumCacheItem[] | undefined}
 */
export function getYadiskAlbumCache(publicUrl) {
  return cache.get(publicUrl);
}

/**
 * @param {(publicUrl: string, items: YadiskAlbumCacheItem[]) => void} fn
 * @returns {() => void}
 */
export function subscribeYadiskAlbumCache(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * @param {YadiskAlbumCacheItem[]} items
 * @param {string} [originPrefix]
 */
export function toFullscreenAlbumItems(items, originPrefix) {
  return items
    .filter((entry) => entry.url || entry.thumbUrl || entry.previewUrl || entry.isLoading)
    .map((entry, index) => {
      const preview = entry.previewUrl || entry.thumbUrl || '';
      const full = entry.url || preview;
      return {
        filename: entry.filename || `media-${index + 1}`,
        url: full,
        thumbUrl: preview || full,
        previewUrl: preview || full,
        isVideo: Boolean(entry.isVideo),
        originKey: originPrefix
          ? `${originPrefix}-${entry.originKey || index}`
          : entry.originKey || `album-${index}`,
        isLoading: Boolean(entry.isLoading) && !full && !preview,
        publicUrl: entry.publicUrl || '',
        path: entry.path || null
      };
    });
}
