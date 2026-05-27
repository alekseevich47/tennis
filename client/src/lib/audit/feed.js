// @ts-check
import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'ЛЕНТА';

/**
 * @param {unknown} value
 * @returns {value is FormData}
 */
function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

/**
 * @param {unknown} media
 */
function getMediaCount(media) {
  if (Array.isArray(media)) return media.length;
  return media ? 1 : 0;
}

/**
 * @param {Record<string, unknown> | FormData} patch
 */
function getChangedFields(patch) {
  if (isFormData(patch)) return Array.from(new Set(Array.from(patch.keys())));
  return Object.keys(patch);
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

export const auditFeed = {
  /**
   * @param {Record<string, unknown>} record
   */
  postCreate(record) {
    const mediaCount = getMediaCount(record.media);

    writeAudit(DOMAIN, 'Пост опубликован', {
      postId: record.id,
      hasMedia: mediaCount > 0,
      mediaCount,
      textLength: String(record.content || record.text || '').length
    });
  },

  /**
   * @param {string} postId
   * @param {Record<string, unknown> | FormData} patch
   */
  postEdit(postId, patch) {
    writeAudit(DOMAIN, 'Пост отредактирован', {
      postId,
      changedFields: getChangedFields(patch)
    });
  },

  /**
   * @param {string} postId
   */
  postSoftDelete(postId) {
    writeAudit(DOMAIN, 'Пост скрыт (soft-delete)', { postId });
  },

  /**
   * @param {string} postId
   */
  postHardDelete(postId) {
    writeAudit(DOMAIN, 'Пост удалён окончательно', { postId });
  },

  /**
   * @param {Record<string, unknown>} record
   */
  mediaUpload(record) {
    writeAudit(DOMAIN, 'Медиа загружено в пост', {
      postId: record.id,
      mediaCount: getMediaCount(record.media)
    });
  },

  /**
   * @param {Record<string, unknown>} record
   * @param {string} postId
   */
  commentCreate(record, postId) {
    writeAudit(DOMAIN, 'Комментарий добавлен', {
      commentId: record.id,
      postId,
      authorId: record.author,
      authorName: getAuthorName(record),
      textPreview: getTextPreview(record.text)
    });
  },

  /**
   * @param {string} commentId
   * @param {string} postId
   */
  commentEdit(commentId, postId) {
    writeAudit(DOMAIN, 'Комментарий отредактирован', { commentId, postId });
  },

  /**
   * @param {string} commentId
   * @param {string} postId
   */
  commentDelete(commentId, postId) {
    writeAudit(DOMAIN, 'Комментарий удалён', { commentId, postId });
  },

  /**
   * @param {string} postId
   */
  likeAdd(postId) {
    writeAudit(DOMAIN, 'Лайк поставлен', { postId });
  },

  /**
   * @param {string} postId
   */
  likeRemove(postId) {
    writeAudit(DOMAIN, 'Лайк снят', { postId });
  },

  /**
   * @param {unknown} err
   */
  postCreateError(err) {
    writeAuditError(DOMAIN, 'Ошибка публикации поста', err);
  },

  /**
   * @param {unknown} err
   * @param {string} postId
   */
  commentCreateError(err, postId) {
    writeAuditError(DOMAIN, 'Ошибка добавления комментария', err, { postId });
  }
};
