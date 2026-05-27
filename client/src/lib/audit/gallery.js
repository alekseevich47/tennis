// @ts-check
import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'ГАЛЕРЕЯ';

/**
 * @param {unknown} media
 */
function hasMedia(media) {
  return Array.isArray(media) ? media.length > 0 : Boolean(media);
}

/**
 * @param {Record<string, unknown>} record
 * @returns {'image' | 'video'}
 */
function getMediaType(record) {
  if (record.media_type === 'video' || record.mediaType === 'video') return 'video';
  if (hasMedia(record.video)) return 'video';
  return 'image';
}

/**
 * @param {unknown} text
 */
function getTextPreview(text) {
  return String(text || '').slice(0, 80);
}

/**
 * @param {Record<string, unknown> | undefined} record
 */
function getAuthorName(record) {
  const expand = /** @type {{ author?: { full_name?: string, name?: string, email?: string } } | undefined} */ (
    record?.expand
  );
  return expand?.author?.full_name || expand?.author?.name || expand?.author?.email || '';
}

export const auditGallery = {
  /**
   * @param {Record<string, unknown>} record
   */
  mediaUpload(record) {
    writeAudit(DOMAIN, 'Медиа загружено в галерею', {
      mediaId: record.id,
      mediaType: getMediaType(record),
      aspectRatio: record.aspect_ratio ?? record.aspectRatio ?? null
    });
  },

  /**
   * @param {string} mediaId
   */
  mediaDelete(mediaId) {
    writeAudit(DOMAIN, 'Медиа удалено из галереи', { mediaId });
  },

  /**
   * @param {string[]} ids
   */
  mediaBatchDelete(ids) {
    writeAudit(DOMAIN, 'Массовое удаление медиа', {
      count: ids.length,
      mediaIds: ids
    });
  },

  /**
   * @param {Record<string, unknown>} record
   * @param {string} mediaId
   */
  commentCreate(record, mediaId) {
    writeAudit(DOMAIN, 'Комментарий добавлен', {
      commentId: record.id,
      mediaId,
      authorId: record.author,
      authorName: getAuthorName(record),
      textPreview: getTextPreview(record.text)
    });
  },

  /**
   * @param {string} commentId
   * @param {string} mediaId
   */
  commentEdit(commentId, mediaId) {
    writeAudit(DOMAIN, 'Комментарий отредактирован', { commentId, mediaId });
  },

  /**
   * @param {string} commentId
   * @param {string} mediaId
   */
  commentDelete(commentId, mediaId) {
    writeAudit(DOMAIN, 'Комментарий удалён', { commentId, mediaId });
  },

  /**
   * @param {string} mediaId
   */
  likeAdd(mediaId) {
    writeAudit(DOMAIN, 'Лайк поставлен', { mediaId });
  },

  /**
   * @param {string} mediaId
   */
  likeRemove(mediaId) {
    writeAudit(DOMAIN, 'Лайк снят', { mediaId });
  },

  /**
   * @param {unknown} err
   */
  uploadError(err) {
    writeAuditError(DOMAIN, 'Ошибка загрузки медиа', err);
  },

  /**
   * @param {unknown} err
   * @param {string} mediaId
   */
  deleteError(err, mediaId) {
    writeAuditError(DOMAIN, 'Ошибка удаления медиа', err, { mediaId });
  }
};
