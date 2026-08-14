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

/** @type {Map<string, number>} */
const loadProgress = new Map();

/** @type {Set<(publicUrl: string, path: string | null | undefined, percent: number | null) => void>} */
const progressListeners = new Set();

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
  if (bytes.fileUrl != null) setMemberLoadProgress(publicUrl, path, 100);
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
 * Оригинал ещё качается: есть preview, `fileUrl` ещё не записан.
 * После неудачной попытки `fileUrl === previewUrl` — больше не pending.
 *
 * @param {{ publicUrl?: string, path?: string | null, url?: string, thumbUrl?: string, previewUrl?: string, isVideo?: boolean, isUpgrading?: boolean }} item
 */
export function isYadiskOriginalPending(item) {
  if (!item?.publicUrl || item.isVideo) return false;
  const cached = getCachedMemberBytes(item.publicUrl, item.path);
  if (cached) return cached.fileUrl == null;
  if (typeof item.isUpgrading === 'boolean') return item.isUpgrading;
  const preview = item.previewUrl || item.thumbUrl || '';
  const url = item.url || '';
  return Boolean(preview) && (!url || url === preview);
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @returns {number | null}
 */
export function getMemberLoadProgress(publicUrl, path) {
  if (!publicUrl) return null;
  const value = loadProgress.get(memberCacheKey(publicUrl, path));
  return typeof value === 'number' ? value : null;
}

/**
 * @param {(publicUrl: string, path: string | null | undefined, percent: number | null) => void} fn
 * @returns {() => void}
 */
export function subscribeMemberLoadProgress(fn) {
  progressListeners.add(fn);
  return () => {
    progressListeners.delete(fn);
  };
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {number | null} percent
 */
export function setMemberLoadProgress(publicUrl, path, percent) {
  if (!publicUrl) return;
  const key = memberCacheKey(publicUrl, path);
  if (percent == null) {
    if (!loadProgress.has(key)) return;
    loadProgress.delete(key);
    progressListeners.forEach((fn) => {
      try {
        fn(publicUrl, path, null);
      } catch {
        // ignore
      }
    });
    return;
  }
  const next = Math.max(0, Math.min(100, percent | 0));
  if (loadProgress.get(key) === next) return;
  loadProgress.set(key, next);
  progressListeners.forEach((fn) => {
    try {
      fn(publicUrl, path, next);
    } catch {
      // ignore
    }
  });
}

/**
 * @param {Array<{ publicUrl?: string, path?: string | null, url?: string, thumbUrl?: string, previewUrl?: string, isLoading?: boolean, isUpgrading?: boolean }>} items
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {CachedMemberBytes} bytes
 */
export function applyCachedBytesToViewerItems(items, publicUrl, path, bytes) {
  if (!publicUrl || !items?.length) return items;
  const preview = bytes.previewUrl;
  const hasOriginal = Boolean(bytes.fileUrl && bytes.fileUrl !== bytes.previewUrl);
  const original = hasOriginal ? bytes.fileUrl : preview;
  const isUpgrading = !bytes.isVideo && bytes.fileUrl == null;
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
      isLoading: false,
      isUpgrading
    };
  });
  return changed ? next : items;
}
