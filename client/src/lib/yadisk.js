// @ts-check

/** Публичные ссылки на файл/папку/альбом Яндекс.Диска (`/i/`, `/d/`, `/a/`, `/public/`). */
export const YADISK_URL_RE =
  /https?:\/\/(?:disk\.yandex\.(?:ru|com(?:\.tr)?)|yadi\.sk)\/(?:i|d|a|public)\/[^\s<"')\]]+/gi;

/**
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function normalizeYadiskUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/[),.\]>'"]+$/g, '');
}

/**
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function extractYadiskUrls(text) {
  if (!text) return [];
  const matches = text.match(YADISK_URL_RE) || [];
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const match of matches) {
    const url = normalizeYadiskUrl(match);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * Убирает URL Яндекс.Диска из HTML/plain текста (как в Telegram).
 * @param {string} html
 * @param {string[]} urls
 * @returns {string}
 */
export function stripYadiskUrlsFromHtml(html, urls) {
  if (!html || !urls?.length) return html || '';
  let next = html;
  for (const url of urls) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`<a\\b[^>]*href=["']${escaped}["'][^>]*>[\\s\\S]*?<\\/a>`, 'gi'), '');
    next = next.split(url).join('');
  }
  return next
    .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br>')
    .replace(/^(?:<br\s*\/?>|\s)+|(?:<br\s*\/?>|\s)+$/gi, '')
    .trim();
}

/**
 * @typedef {{
 *   source: string,
 *   publicUrl: string,
 *   name: string,
 *   mediaType: 'image' | 'video',
 *   type?: 'file' | 'album',
 *   path?: string | null
 * }} YadiskStoredMedia
 */

/**
 * @param {unknown} value
 * @returns {YadiskStoredMedia[]}
 */
export function normalizeExternalMedia(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = /** @type {Record<string, unknown>} */ (entry);
    const publicUrl = normalizeYadiskUrl(
      typeof item.publicUrl === 'string' ? item.publicUrl : ''
    );
    if (!publicUrl) return [];
    const isAlbum = item.type === 'album';
    const mediaType = item.mediaType === 'video' ? 'video' : 'image';
    return [
      {
        source: typeof item.source === 'string' ? item.source : 'yadisk',
        publicUrl,
        name: typeof item.name === 'string' && item.name ? item.name : isAlbum ? 'Альбом' : 'media',
        mediaType,
        type: isAlbum ? 'album' : 'file',
        path: typeof item.path === 'string' && item.path ? item.path : null
      }
    ];
  });
}

/**
 * Компактная запись для сохранения в `posts.external_media` / `tournament_posts.external_media`.
 * @param {{
 *   publicUrl: string,
 *   name: string,
 *   mediaType: 'image' | 'video',
 *   source?: string,
 *   type?: 'file' | 'album',
 *   path?: string | null
 * }} item
 */
export function toStoredExternalMedia(item) {
  /** @type {YadiskStoredMedia} */
  const stored = {
    source: item.source || 'yadisk',
    publicUrl: item.publicUrl,
    name: item.name,
    mediaType: item.mediaType,
    type: item.type === 'album' ? 'album' : 'file'
  };
  if (item.type !== 'album' && item.path) {
    stored.path = item.path;
  }
  return stored;
}

/**
 * @param {YadiskStoredMedia[]} items
 * @returns {boolean}
 */
export function hasYadiskAlbum(items) {
  return items.some((item) => item.type === 'album');
}
