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
 * Скачивает файл через $filesystem.fileFromURL.
 * ($http.send для бинарников часто даёт 200 и пустой body — отсюда ошибка «не отдал файл (200)»).
 *
 * @param {string} publicUrl
 * @param {string} kind 'preview' | 'file'
 * @returns {{ status?: number, error?: string, file?: any, contentType?: string, name?: string, mediaType?: string }}
 */
function fetchContentFile(publicUrl, kind) {
  var resolved = resolvePublicResource(publicUrl);
  if (resolved.error) return resolved;

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
  isYadiskPublicUrl: isYadiskPublicUrl,
  resolvePublicResource: resolvePublicResource,
  fetchContentFile: fetchContentFile
};
