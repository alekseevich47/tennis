// @ts-check
/**
 * Сессионный кэш blob URL для Яндекс.Диска.
 * Живёт до перезагрузки страницы — не revoke при свайпе/размонтировании карточки.
 */

/**
 * @typedef {{
 *   previewUrl: string,
 *   fileUrl: string | null,
 *   isVideo: boolean,
 *   name: string,
 *   displayUrl: string
 * }} CachedMemberBytes
 */

/** @type {Map<string, CachedMemberBytes>} */
const cache = new Map();

/** @type {Set<(publicUrl: string, path: string | null | undefined, bytes: CachedMemberBytes) => void>} */
const listeners = new Set();

/**
 * Кэш живёт в JS-куче webview до перезагрузки мини-приложения (смена таба Feed размонтирует, Map — нет).
 *
 * @param {(publicUrl: string, path: string | null | undefined, bytes: CachedMemberBytes) => void} fn
 * @returns {() => void}
 */
export function subscribeYadiskMediaCache(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {CachedMemberBytes} bytes
 */
function notify(publicUrl, path, bytes) {
  listeners.forEach((fn) => {
    try {
      fn(publicUrl, path, bytes);
    } catch {
      // ignore
    }
  });
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 */
export function memberCacheKey(publicUrl, path) {
  return `${publicUrl}::${path || ''}`;
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @returns {CachedMemberBytes | undefined}
 */
export function getCachedMemberBytes(publicUrl, path) {
  return cache.get(memberCacheKey(publicUrl, path));
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {CachedMemberBytes} bytes
 */
export function setCachedMemberBytes(publicUrl, path, bytes) {
  cache.set(memberCacheKey(publicUrl, path), bytes);
  notify(publicUrl, path, bytes);
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {Partial<CachedMemberBytes>} patch
 */
export function patchCachedMemberBytes(publicUrl, path, patch) {
  const key = memberCacheKey(publicUrl, path);
  const prev = cache.get(key);
  if (!prev) return;
  const fileUrl = patch.fileUrl !== undefined ? patch.fileUrl : prev.fileUrl;
  const previewUrl = patch.previewUrl !== undefined ? patch.previewUrl : prev.previewUrl;
  const isVideo = patch.isVideo !== undefined ? patch.isVideo : prev.isVideo;
  const name = patch.name !== undefined ? patch.name : prev.name;
  const displayUrl =
    patch.displayUrl !== undefined
      ? patch.displayUrl
      : fileUrl && fileUrl !== previewUrl
        ? fileUrl
        : previewUrl;
  const next = { previewUrl, fileUrl, isVideo, name, displayUrl };
  cache.set(key, next);
  notify(publicUrl, path, next);
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isSessionCachedBlobUrl(url) {
  if (!url || typeof url !== 'string') return false;
  for (const entry of cache.values()) {
    if (entry.previewUrl === url || entry.fileUrl === url || entry.displayUrl === url) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Array<{ publicUrl?: string, path?: string | null, url?: string, thumbUrl?: string, previewUrl?: string, isLoading?: boolean }>} items
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {CachedMemberBytes} bytes
 */
export function applyCachedBytesToViewerItems(items, publicUrl, path, bytes) {
  if (!publicUrl || !items?.length) return items;
  const preview = bytes.previewUrl;
  const original =
    bytes.fileUrl && bytes.fileUrl !== bytes.previewUrl ? bytes.fileUrl : preview;
  let changed = false;
  const next = items.map((item) => {
    if (item.publicUrl !== publicUrl) return item;
    if ((item.path || '') !== (path || '')) return item;
    changed = true;
    return {
      ...item,
      url: original || item.url,
      thumbUrl: preview || item.thumbUrl,
      previewUrl: preview || item.previewUrl,
      isLoading: false
    };
  });
  return changed ? next : items;
}
