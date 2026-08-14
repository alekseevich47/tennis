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
  cache.set(key, { previewUrl, fileUrl, isVideo, name, displayUrl });
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
