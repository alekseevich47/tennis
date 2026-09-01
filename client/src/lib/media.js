// @ts-check
import { MEDIA_BASE_URL, PB_URL } from '../config';

export const MAX_POST_MEDIA_FILES = 5;

/** Крошечный thumb для LQIP (progressive preview в ленте). */
export const MEDIA_LQIP_THUMB = '100x0';

/** Thumb карточки / сетки (после LQIP). */
export const MEDIA_CARD_THUMB = '800x0';

/**
 * @typedef {{ id: string, collectionId?: string, collectionName?: string }} BaseRecord
 */

/**
 * Универсальный билдер ссылки на файл PocketBase.
 * `${MEDIA_BASE_URL}/<collection>/<recordId>/<filename>`
 *
 * @param {BaseRecord | null | undefined} record
 * @param {string} collectionFallback - использовать если record.collectionName/collectionId отсутствует
 * @param {string | string[] | null | undefined} fileField
 * @returns {string | null}
 */
export function getMediaUrl(record, collectionFallback, fileField) {
  if (!record || !fileField) return null;
  const filename = Array.isArray(fileField) ? fileField[0] : fileField;
  if (!filename || typeof filename !== 'string') return null;
  const collection =
    record.collectionName || record.collectionId || collectionFallback;
  return `${MEDIA_BASE_URL}/${collection}/${record.id}/${filename}`;
}

/**
 * URL poster для видео (серверный ffmpeg, /api/video-poster).
 *
 * @param {BaseRecord | null | undefined} record
 * @param {string} collectionFallback
 * @param {string | string[] | null | undefined} fileField
 * @param {string} [thumb]
 * @returns {string | null}
 */
export function getVideoPosterUrl(
  record,
  collectionFallback,
  fileField,
  thumb = MEDIA_CARD_THUMB
) {
  if (!record?.id || !fileField) return null;
  const filename = Array.isArray(fileField) ? fileField[0] : fileField;
  if (!filename || !isVideoMediaName(filename)) return null;
  const collection =
    record.collectionName || record.collectionId || collectionFallback;
  const params = new URLSearchParams({
    collection,
    record: record.id,
    file: filename,
    thumb
  });
  return `${PB_URL}/api/video-poster?${params.toString()}`;
}

/**
 * @param {BaseRecord | null | undefined} record
 * @param {string} collectionFallback
 * @param {string | string[] | null | undefined} fileField
 * @param {string} [thumb]
 * @returns {string | null}
 */
export function getMediaThumbUrl(
  record,
  collectionFallback,
  fileField,
  thumb = MEDIA_CARD_THUMB
) {
  const filename = Array.isArray(fileField) ? fileField[0] : fileField;
  if (filename && isVideoMediaName(filename)) {
    return getVideoPosterUrl(record, collectionFallback, fileField, thumb);
  }

  const url = getMediaUrl(record, collectionFallback, fileField);
  if (!url) return null;

  return `${url}?thumb=${thumb}`;
}

/**
 * Извлечь первое имя файла из поля, которое может быть строкой или массивом.
 * @param {string | string[] | null | undefined} fileField
 */
export function firstFileName(fileField) {
  if (!fileField) return null;
  if (Array.isArray(fileField)) return fileField[0] || null;
  return typeof fileField === 'string' ? fileField : null;
}

/**
 * Нормализует поле PocketBase file (`string | string[]`) в массив имён файлов.
 * @param {string | string[] | null | undefined} fileField
 * @returns {string[]}
 */
export function mediaNames(fileField) {
  if (!fileField) return [];
  if (Array.isArray(fileField)) return fileField.filter(Boolean);
  return typeof fileField === 'string' ? [fileField] : [];
}

/**
 * @param {string | null | undefined} filename
 */
export function isVideoMediaName(filename) {
  return typeof filename === 'string' && /\.(mp4|webm|mov)$/i.test(filename);
}

/**
 * @param {File | null | undefined} file
 */
export function isVideoFile(file) {
  return Boolean(file?.type?.startsWith('video/')) || isVideoMediaName(file?.name);
}

/**
 * Просим браузер сразу декодировать первый кадр, чтобы preview не выглядел серым блоком.
 * @param {string} url
 */
export function videoPreviewUrl(url) {
  if (!url || url.includes('#t=')) return url;
  return `${url}#t=0.1`;
}

/**
 * @param {FileList | null | undefined} fileList
 * @param {number} [limit]
 * @returns {File[]}
 */
export function readSelectedFiles(fileList, limit = MAX_POST_MEDIA_FILES) {
  return Array.from(fileList || []).slice(0, limit);
}
