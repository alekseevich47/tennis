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

module.exports = {
  normalizePublicUrl: normalizePublicUrl,
  isYadiskPublicUrl: isYadiskPublicUrl,
  resolvePublicResource: resolvePublicResource
};
