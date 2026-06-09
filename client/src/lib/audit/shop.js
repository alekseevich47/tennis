// @ts-check
import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'МАГАЗИН';

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

/**
 * @param {Record<string, unknown>} record
 */
function getCategories(record) {
  if (Array.isArray(record.categories)) return record.categories;
  if (typeof record.categories === 'string' && record.categories) return [record.categories];
  return [];
}

export const auditShop = {
  /**
   * @param {Record<string, unknown>} record
   */
  productCreate(record) {
    writeAudit(DOMAIN, 'Товар создан', {
      productId: record.id,
      title: record.title,
      price: record.price,
      categories: getCategories(record)
    });
  },

  /**
   * @param {string} productId
   * @param {Record<string, unknown> | FormData} patch
   */
  productEdit(productId, patch) {
    writeAudit(DOMAIN, 'Товар отредактирован', {
      productId,
      changedFields: getChangedFields(patch)
    });
  },

  /**
   * @param {string} productId
   */
  productSoftDelete(productId) {
    writeAudit(DOMAIN, 'Товар скрыт', { productId });
  },

  /**
   * @param {string} productId
   */
  productRestore(productId) {
    writeAudit(DOMAIN, 'Товар восстановлен', { productId });
  },

  /**
   * @param {string} productId
   */
  productHardDelete(productId) {
    writeAudit(DOMAIN, 'Товар удалён', { productId });
  },

  /**
   * @param {unknown} err
   */
  productCreateError(err) {
    writeAuditError(DOMAIN, 'Ошибка создания товара', err);
  },

  /**
   * @param {unknown} err
   * @param {string} productId
   */
  productEditError(err, productId) {
    writeAuditError(DOMAIN, 'Ошибка редактирования товара', err, { productId });
  },

  /**
   * @param {string} orderId
   * @param {number} itemsCount
   */
  orderCreate(orderId, itemsCount) {
    writeAudit(DOMAIN, 'Заказ создан', { orderId, itemsCount });
  },

  /**
   * @param {string} orderId
   * @param {string} newStatus
   */
  orderStatusChange(orderId, newStatus) {
    writeAudit(DOMAIN, 'Статус заказа изменён', { orderId, newStatus });
  },

  /**
   * @param {string} orderId
   * @param {string} productId
   */
  orderItemRemoved(orderId, productId) {
    writeAudit(DOMAIN, 'Товар удалён из заказа', { orderId, productId });
  },

  /**
   * @param {string} orderId
   */
  orderDeleted(orderId) {
    writeAudit(DOMAIN, 'Заказ удалён', { orderId });
  }
};
