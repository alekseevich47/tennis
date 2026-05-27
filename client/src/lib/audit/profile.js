// @ts-check
import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'ПРОФИЛЬ';

/**
 * @param {unknown} value
 * @returns {value is FormData}
 */
function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

/**
 * @param {Record<string, unknown> | FormData} patch
 */
function getChangedFields(patch) {
  if (isFormData(patch)) return Array.from(new Set(Array.from(patch.keys())));
  return Object.keys(patch);
}

export const auditProfile = {
  /**
   * @param {string} userId
   * @param {Record<string, unknown> | FormData} patch
   */
  profileEdit(userId, patch) {
    writeAudit(DOMAIN, 'Профиль отредактирован', {
      targetUserId: userId,
      changedFields: getChangedFields(patch)
    });
  },

  /**
   * @param {string} userId
   */
  avatarUpload(userId) {
    writeAudit(DOMAIN, 'Аватар обновлён', { targetUserId: userId });
  },

  /**
   * @param {unknown} err
   * @param {string} userId
   */
  profileEditError(err, userId) {
    writeAuditError(DOMAIN, 'Ошибка редактирования профиля', err, { targetUserId: userId });
  }
};
