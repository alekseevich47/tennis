// @ts-check
import { writeAudit } from './core';

const DOMAIN = 'АДМИНИСТРИРОВАНИЕ';

/**
 * @param {unknown} value
 * @returns {value is FormData}
 */
function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

/**
 * @param {Record<string, unknown> | FormData} patch
 * @returns {string[]}
 */
function getChangedFields(patch) {
  if (isFormData(patch)) return Array.from(new Set(Array.from(patch.keys())));
  return Object.keys(patch);
}

export const auditAdmin = {
  /**
   * @param {Record<string, unknown>} record
   * @param {boolean} [sendNow]
   */
  broadcastCreate(record, sendNow = false) {
    writeAudit(DOMAIN, 'Рассылка создана', {
      broadcastId: record.id,
      audience: record.audience,
      recipientsCount: (record.recipients || []).length,
      sendNow,
      scheduledAt: record.scheduled_at
    });
  },

  /**
   * @param {string} id
   * @param {string[] | Record<string, unknown> | FormData} changedFields
   */
  broadcastEdit(id, changedFields) {
    writeAudit(DOMAIN, 'Рассылка изменена', {
      broadcastId: id,
      changedFields: Array.isArray(changedFields) ? changedFields : getChangedFields(changedFields)
    });
  },

  /**
   * @param {string} id
   */
  broadcastCancel(id) {
    writeAudit(DOMAIN, 'Рассылка отменена', { broadcastId: id });
  },

  /**
   * @param {Record<string, unknown>} record
   * @param {boolean} [sendNow]
   */
  notificationCreate(record, sendNow = false) {
    writeAudit(DOMAIN, 'Уведомление создано', {
      notificationId: record.id,
      title: record.title,
      audience: record.audience,
      recipientsCount: (record.recipients || []).length,
      sendNow,
      scheduledAt: record.scheduled_at
    });
  },

  /**
   * @param {string} id
   * @param {string[] | Record<string, unknown> | FormData} changedFields
   */
  notificationEdit(id, changedFields) {
    writeAudit(DOMAIN, 'Уведомление изменено', {
      notificationId: id,
      changedFields: Array.isArray(changedFields) ? changedFields : getChangedFields(changedFields)
    });
  },

  /**
   * @param {string} id
   */
  notificationCancel(id) {
    writeAudit(DOMAIN, 'Уведомление отменено', { notificationId: id });
  },

  /**
   * @param {string} field
   * @param {boolean} value
   */
  settingToggled(field, value) {
    writeAudit(DOMAIN, 'Настройка уведомлений изменена', { field, value });
  }
};
