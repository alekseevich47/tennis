// Резолв публичных ссылок Яндекс.Диска (без OAuth).
// Вызывать только через require(__hooks + '/yadisklib.js') внутри хендлеров.

var PUBLIC_META_URL = 'https://cloud-api.yandex.net/v1/disk/public/resources';
var PUBLIC_DOWNLOAD_URL = 'https://cloud-api.yandex.net/v1/disk/public/resources/download';

var YADISK_URL_RE =
  /^https?:\/\/(?:disk\.yandex\.(?:ru|com(?:\.tr)?)|yadi\.sk)\/(?:i|d|public)\/[^\s?#]+/i;

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizePublicUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  var trimmed = raw.trim();
  // Обрезаем хвост пунктуации из plain-text / HTML.
  trimmed = trimmed.replace(/[),.\]>'"]+$/g, '');
  return trimmed;
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
 * @param {any} headers
 * @param {string} fallback
 * @returns {string}
 */
function headerValue(headers, fallback) {
  if (!headers) return fallback;
  var raw = headers['Content-Type'] || headers['content-type'];
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).split(';')[0].trim() || fallback;
  if (typeof raw === 'string' && raw) return raw.split(';')[0].trim();
  return fallback;
}

/**
 * @param {string} publicUrl
 * @returns {{ status?: number, error?: string, item?: object }}
 */
function resolvePublicResource(publicUrl) {
  var url = normalizePublicUrl(publicUrl);
  if (!isYadiskPublicUrl(url)) {
    return { status: 400, error: 'Некорректная ссылка Яндекс.Диска' };
  }

  var metaRes;
  try {
    metaRes = $http.send({
      method: 'GET',
      url:
        PUBLIC_META_URL +
        '?public_key=' +
        encodeURIComponent(url) +
        '&preview_size=XL',
      timeout: 12
    });
  } catch (err) {
    return { status: 502, error: 'Не удалось связаться с Яндекс.Диском' };
  }

  if (metaRes.statusCode === 404) {
    return { status: 404, error: 'Файл не найден или ссылка закрыта' };
  }
  if (metaRes.statusCode !== 200 || !metaRes.json) {
    return { status: 502, error: 'Яндекс.Диск вернул ошибку (' + metaRes.statusCode + ')' };
  }

  var resource = metaRes.json;
  if (resource.type === 'dir') {
    return {
      status: 400,
      error: 'Нужна ссылка на файл (фото/видео), не на папку'
    };
  }

  var kind = detectMediaKind(resource);
  if (!kind) {
    return { status: 400, error: 'Поддерживаются только фото и видео' };
  }

  var fileUrl = '';
  try {
    var dlRes = $http.send({
      method: 'GET',
      url: PUBLIC_DOWNLOAD_URL + '?public_key=' + encodeURIComponent(url),
      timeout: 12
    });
    if (dlRes.statusCode === 200 && dlRes.json && dlRes.json.href) {
      fileUrl = String(dlRes.json.href);
    }
  } catch (dlErr) {
    // preview может хватить для фото
  }

  var previewUrl = resource.preview ? String(resource.preview) : '';
  if (!previewUrl && kind === 'image') {
    previewUrl = fileUrl;
  }
  if (!fileUrl && !previewUrl) {
    return { status: 502, error: 'Не удалось получить ссылку на файл' };
  }

  return {
    item: {
      source: 'yadisk',
      publicUrl: url,
      publicKey: resource.public_key ? String(resource.public_key) : url,
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
 * Скачивает preview/file через сервер (browser не может грузить downloader.disk.yandex.ru напрямую).
 * @param {string} publicUrl
 * @param {string} kind 'preview' | 'file'
 * @returns {{ status?: number, error?: string, body?: any, contentType?: string, name?: string, mediaType?: string }}
 */
function fetchContentBytes(publicUrl, kind) {
  var resolved = resolvePublicResource(publicUrl);
  if (resolved.error) return resolved;

  var item = resolved.item;
  var target = '';
  if (kind === 'file') {
    target = item.fileUrl || item.previewUrl || '';
  } else {
    target = item.previewUrl || item.fileUrl || '';
  }
  if (!target) {
    return { status: 502, error: 'Нет ссылки на контент' };
  }

  var fileRes;
  try {
    fileRes = $http.send({
      method: 'GET',
      url: target,
      timeout: 60,
      headers: {
        Accept: '*/*'
      }
    });
  } catch (err) {
    return { status: 502, error: 'Не удалось скачать файл с Диска' };
  }

  if (fileRes.statusCode < 200 || fileRes.statusCode >= 300 || !fileRes.body) {
    return {
      status: 502,
      error: 'Яндекс.Диск не отдал файл (' + fileRes.statusCode + ')'
    };
  }

  var fallbackType =
    item.mediaType === 'video' ? 'video/mp4' : item.mimeType || 'image/jpeg';

  return {
    body: fileRes.body,
    contentType: headerValue(fileRes.headers, fallbackType),
    name: item.name,
    mediaType: item.mediaType
  };
}

module.exports = {
  normalizePublicUrl: normalizePublicUrl,
  isYadiskPublicUrl: isYadiskPublicUrl,
  resolvePublicResource: resolvePublicResource,
  fetchContentBytes: fetchContentBytes
};
