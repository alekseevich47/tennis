// Резолв публичных ссылок Яндекс.Диска (без OAuth).
// Вызывать только через require(__hooks + '/yadisklib.js') внутри хендлеров.

var PUBLIC_META_URL = 'https://cloud-api.yandex.net/v1/disk/public/resources';
var PUBLIC_DOWNLOAD_URL = 'https://cloud-api.yandex.net/v1/disk/public/resources/download';

var YADISK_URL_RE =
  /^https?:\/\/(?:disk\.yandex\.(?:ru|com(?:\.tr)?)|yadi\.sk)\/(?:i|d|a|public)\/[^\s?#]+/i;

var LIST_LIMIT = 100;
var MAX_ALBUM_DEPTH = 24;
var RESOLVE_CACHE_TTL_MS = 600000;
/** @type {Record<string, { expires: number, value: object }>} */
var resolveCache = {};

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizePublicUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  var trimmed = raw.trim();
  trimmed = trimmed.replace(/[),.\]>'"]+$/g, '');
  return trimmed;
}

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizePath(raw) {
  if (!raw || typeof raw !== 'string') return '';
  var path = raw.trim();
  if (!path || path === '/') return '';
  if (path.indexOf('disk:') === 0) {
    path = path.slice(5);
  }
  if (path.charAt(0) !== '/') path = '/' + path;
  return path;
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isYadiskPublicUrl(url) {
  return YADISK_URL_RE.test(normalizePublicUrl(url));
}

/**
 * @param {any} resource
 * @returns {'image'|'video'|null}
 */
function detectMediaKind(resource) {
  if (!resource || resource.type !== 'file') return null;
  var mediaType = String(resource.media_type || '').toLowerCase();
  var mime = String(resource.mime_type || '').toLowerCase();
  var name = String(resource.name || '').toLowerCase();

  if (mediaType === 'image' || mime.indexOf('image/') === 0) return 'image';
  if (mediaType === 'video' || mime.indexOf('video/') === 0) return 'video';
  if (/\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(name)) return 'image';
  if (/\.(mp4|webm|mov|m4v|mkv)$/i.test(name)) return 'video';
  return null;
}

/**
 * @param {any} item
 * @returns {string}
 */
function guessContentType(item) {
  var name = String((item && item.name) || '').toLowerCase();
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.gif$/i.test(name)) return 'image/gif';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.bmp$/i.test(name)) return 'image/bmp';
  if (/\.heic$/i.test(name)) return 'image/heic';
  if (/\.mp4$/i.test(name)) return 'video/mp4';
  if (/\.webm$/i.test(name)) return 'video/webm';
  if (/\.mov$/i.test(name)) return 'video/quicktime';
  if (item && item.mimeType) return item.mimeType;
  return item && item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
}

/**
 * @param {string} publicUrl
 * @param {string} [path]
 * @returns {string}
 */
function buildMetaUrl(publicUrl, path) {
  var url =
    PUBLIC_META_URL +
    '?public_key=' +
    encodeURIComponent(publicUrl) +
    '&preview_size=S';
  var normalizedPath = normalizePath(path || '');
  if (normalizedPath) {
    url += '&path=' + encodeURIComponent(normalizedPath);
  }
  return url;
}

/**
 * @param {string} publicUrl
 * @param {string} [path]
 * @returns {string}
 */
function buildDownloadUrl(publicUrl, path) {
  var url = PUBLIC_DOWNLOAD_URL + '?public_key=' + encodeURIComponent(publicUrl);
  var normalizedPath = normalizePath(path || '');
  if (normalizedPath) {
    url += '&path=' + encodeURIComponent(normalizedPath);
  }
  return url;
}

/**
 * @param {string} publicUrl
 * @param {string} [path]
 * @param {number} [offset]
 * @param {number} [limit]
 * @returns {{ status?: number, error?: string, resource?: object }}
 */
function fetchPublicResource(publicUrl, path, offset, limit) {
  var url = buildMetaUrl(publicUrl, path);
  if (typeof offset === 'number' && offset > 0) {
    url += '&offset=' + offset;
  }
  if (typeof limit === 'number' && limit > 0) {
    url += '&limit=' + limit;
  } else {
    url += '&limit=' + LIST_LIMIT;
  }

  var metaRes;
  try {
    metaRes = $http.send({
      method: 'GET',
      url: url,
      timeout: 20
    });
  } catch (err) {
    return { status: 502, error: 'Не удалось связаться с Яндекс.Диском' };
  }

  if (metaRes.statusCode === 404) {
    var isAlbumLink = /\/a\//i.test(String(publicUrl || ''));
    return {
      status: 404,
      error: isAlbumLink
        ? 'Альбом недоступен по публичному API. Откройте «Поделиться» и скопируйте публичную ссылку (обычно /d/ или /i/)'
        : 'Файл не найден или ссылка закрыта'
    };
  }
  if (metaRes.statusCode !== 200 || !metaRes.json) {
    return { status: 502, error: 'Яндекс.Диск вернул ошибку (' + metaRes.statusCode + ')' };
  }

  return { resource: metaRes.json };
}

/**
 * @param {string} publicUrl
 * @param {string} [path]
 * @returns {string}
 */
function fetchDownloadHref(publicUrl, path) {
  try {
    var dlRes = $http.send({
      method: 'GET',
      url: buildDownloadUrl(publicUrl, path),
      timeout: 12
    });
    if (dlRes.statusCode === 200 && dlRes.json && dlRes.json.href) {
      return String(dlRes.json.href);
    }
  } catch (dlErr) {
    // preview может хватить для фото
  }
  return '';
}

/**
 * @param {object} resource
 * @param {string} publicUrl
 * @param {string} [path]
 * @returns {{ status?: number, error?: string, item?: object }}
 */
function buildFileItem(resource, publicUrl, path) {
  var kind = detectMediaKind(resource);
  if (!kind) {
    return { status: 400, error: 'Поддерживаются только фото и видео' };
  }

  var normalizedPath = normalizePath(path || '');
  var fileUrl = fetchDownloadHref(publicUrl, normalizedPath);
  var previewUrl = resource.preview ? String(resource.preview) : '';
  if (!previewUrl && kind === 'image') {
    previewUrl = fileUrl;
  }
  if (!fileUrl && !previewUrl) {
    return { status: 502, error: 'Не удалось получить ссылку на файл' };
  }

  return {
    item: {
      type: 'file',
      source: 'yadisk',
      publicUrl: publicUrl,
      path: normalizedPath || null,
      publicKey: resource.public_key ? String(resource.public_key) : publicUrl,
      name: resource.name ? String(resource.name) : 'media',
      mediaType: kind,
      mimeType: resource.mime_type ? String(resource.mime_type) : '',
      size: typeof resource.size === 'number' ? resource.size : null,
      previewUrl: previewUrl || null,
      fileUrl: fileUrl || null
    }
  };
}

/**
 * Рекурсивный обход публичной папки → список медиа-файлов.
 *
 * @param {string} publicUrl
 * @param {string} path
 * @param {number} depth
 * @param {Array} out
 * @returns {{ status?: number, error?: string } | null}
 */
function collectAlbumItems(publicUrl, path, depth, out) {
  if (depth > MAX_ALBUM_DEPTH) return null;

  var offset = 0;
  var total = Infinity;

  while (offset < total) {
    var listed = fetchPublicResource(publicUrl, path, offset, LIST_LIMIT);
    if (listed.error) return listed;

    var resource = listed.resource;
    var embedded = resource && resource._embedded ? resource._embedded : null;
    var items = embedded && Array.isArray(embedded.items) ? embedded.items : [];
    total =
      embedded && typeof embedded.total === 'number' ? embedded.total : items.length + offset;

    for (var i = 0; i < items.length; i++) {
      var child = items[i];
      if (!child) continue;
      var childPath = child.path ? String(child.path) : '';
      if (!childPath && child.name) {
        childPath = (path || '') + '/' + String(child.name);
        childPath = normalizePath(childPath);
      }

      if (child.type === 'dir') {
        var nested = collectAlbumItems(publicUrl, childPath, depth + 1, out);
        if (nested && nested.error) return nested;
        continue;
      }

      var kind = detectMediaKind(child);
      if (!kind) continue;

      out.push({
        path: normalizePath(childPath),
        name: child.name ? String(child.name) : 'media',
        mediaType: kind,
        mimeType: child.mime_type ? String(child.mime_type) : '',
        size: typeof child.size === 'number' ? child.size : null
      });
    }

    offset += items.length;
    if (!items.length) break;
  }

  return null;
}

/**
 * @param {string} publicUrl
 * @returns {{ status?: number, error?: string, item?: object }}
 */
function resolvePublicAlbum(publicUrl) {
  var listed = fetchPublicResource(publicUrl, '', 0, 1);
  if (listed.error) return listed;

  var root = listed.resource;
  if (!root || root.type !== 'dir') {
    return { status: 400, error: 'Нужна ссылка на папку (альбом)' };
  }

  /** @type {Array} */
  var items = [];
  var walkError = collectAlbumItems(publicUrl, '', 0, items);
  if (walkError && walkError.error) return walkError;

  if (!items.length) {
    return { status: 400, error: 'В папке нет фото или видео' };
  }

  return {
    item: {
      type: 'album',
      source: 'yadisk',
      publicUrl: publicUrl,
      publicKey: root.public_key ? String(root.public_key) : publicUrl,
      name: root.name ? String(root.name) : 'Альбом',
      mediaType: items[0].mediaType,
      items: items,
      cover: items[0]
    }
  };
}

/**
 * @param {string} publicUrl
 * @param {string} [path]
 * @returns {string}
 */
function resolveCacheKey(publicUrl, path) {
  return normalizePublicUrl(publicUrl) + '\0' + normalizePath(path || '');
}

/**
 * @param {string} key
 * @returns {object | null}
 */
function getResolveCache(key) {
  var entry = resolveCache[key];
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    delete resolveCache[key];
    return null;
  }
  return entry.value;
}

/**
 * @param {string} key
 * @param {object} value
 */
function setResolveCache(key, value) {
  resolveCache[key] = { expires: Date.now() + RESOLVE_CACHE_TTL_MS, value: value };
}

/**
 * @param {string} publicUrl
 * @param {string} [path]
 * @returns {{ status?: number, error?: string, item?: object }}
 */
function resolvePublicResource(publicUrl, path) {
  var url = normalizePublicUrl(publicUrl);
  if (!isYadiskPublicUrl(url)) {
    return { status: 400, error: 'Некорректная ссылка Яндекс.Диска' };
  }

  var normalizedPath = normalizePath(path || '');
  var cacheKey = resolveCacheKey(url, normalizedPath);
  var cached = getResolveCache(cacheKey);
  if (cached) return cached;

  var fetched = fetchPublicResource(url, normalizedPath, 0, LIST_LIMIT);
  if (fetched.error) return fetched;

  var resource = fetched.resource;
  var result;
  if (resource.type === 'dir') {
    result = resolvePublicAlbum(url);
  } else {
    result = buildFileItem(resource, url, normalizedPath);
  }

  if (!result.error) {
    setResolveCache(cacheKey, result);
  }
  return result;
}

/**
 * Скачивает файл через $filesystem.fileFromURL.
 * ($http.send для бинарников часто даёт 200 и пустой body — отсюда ошибка «не отдал файл (200)»).
 *
 * @param {string} publicUrl
 * @param {string} kind 'preview' | 'file'
 * @param {string} [path]
 * @returns {{ status?: number, error?: string, file?: any, contentType?: string, name?: string, mediaType?: string }}
 */
function fetchContentFile(publicUrl, kind, path) {
  var resolved = resolvePublicResource(publicUrl, path);
  if (resolved.error) return resolved;
  if (resolved.item && resolved.item.type === 'album') {
    return { status: 400, error: 'Нужна ссылка на файл внутри альбома' };
  }

  var item = resolved.item;
  /** @type {string[]} */
  var candidates = [];
  if (kind === 'file') {
    if (item.fileUrl) candidates.push(item.fileUrl);
    if (item.previewUrl && item.previewUrl !== item.fileUrl) candidates.push(item.previewUrl);
  } else {
    if (item.previewUrl) candidates.push(item.previewUrl);
    if (item.fileUrl && item.fileUrl !== item.previewUrl) candidates.push(item.fileUrl);
  }
  if (!candidates.length) {
    return { status: 502, error: 'Нет ссылки на контент' };
  }

  var lastError = '';
  for (var i = 0; i < candidates.length; i++) {
    try {
      var file = $filesystem.fileFromURL(candidates[i], 60);
      if (file && file.size > 0) {
        return {
          file: file,
          contentType: guessContentType(item),
          name: item.name,
          mediaType: item.mediaType
        };
      }
      lastError = 'пустой ответ';
    } catch (err) {
      lastError = String(err && err.message ? err.message : err);
    }
  }

  return {
    status: 502,
    error: lastError
      ? 'Яндекс.Диск не отдал файл: ' + lastError
      : 'Яндекс.Диск не отдал файл'
  };
}

module.exports = {
  normalizePublicUrl: normalizePublicUrl,
  normalizePath: normalizePath,
  isYadiskPublicUrl: isYadiskPublicUrl,
  resolvePublicResource: resolvePublicResource,
  resolvePublicAlbum: resolvePublicAlbum,
  fetchContentFile: fetchContentFile
};
