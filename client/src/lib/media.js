// @ts-check
import { MEDIA_BASE_URL } from '../config';

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
 * Извлечь первое имя файла из поля, которое может быть строкой или массивом.
 * @param {string | string[] | null | undefined} fileField
 */
export function firstFileName(fileField) {
  if (!fileField) return null;
  if (Array.isArray(fileField)) return fileField[0] || null;
  return typeof fileField === 'string' ? fileField : null;
}
