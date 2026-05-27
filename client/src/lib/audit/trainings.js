// @ts-check
import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'ТРЕНИРОВКИ';

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
 * @param {Record<string, unknown>} training
 */
function getTrainingId(training) {
  return training.id;
}

/**
 * @param {Record<string, unknown>} training
 */
function getMaxSlots(training) {
  return training.max_slots ?? training.maxSlots ?? null;
}

/**
 * @param {Record<string, unknown>} training
 */
function getBookedUsers(training) {
  return Array.isArray(training.booked_users) ? training.booked_users : [];
}

export const auditTrainings = {
  /**
   * @param {Record<string, unknown>} record
   */
  trainingCreate(record) {
    writeAudit(DOMAIN, 'Тренировка создана', {
      trainingId: getTrainingId(record),
      date: record.date,
      type: record.type,
      location: record.location,
      maxSlots: getMaxSlots(record)
    });
  },

  /**
   * @param {string} trainingId
   * @param {Record<string, unknown> | FormData} patch
   */
  trainingEdit(trainingId, patch) {
    writeAudit(DOMAIN, 'Тренировка отредактирована', {
      trainingId,
      changedFields: getChangedFields(patch)
    });
  },

  /**
   * @param {string} trainingId
   */
  trainingSoftDelete(trainingId) {
    writeAudit(DOMAIN, 'Тренировка скрыта', { trainingId });
  },

  /**
   * @param {string} trainingId
   */
  trainingRestore(trainingId) {
    writeAudit(DOMAIN, 'Тренировка восстановлена', { trainingId });
  },

  /**
   * @param {string} trainingId
   */
  trainingHardDelete(trainingId) {
    writeAudit(DOMAIN, 'Тренировка удалена', { trainingId });
  },

  /**
   * @param {string} trainingId
   */
  trainingClose(trainingId) {
    writeAudit(DOMAIN, 'Тренировка закрыта', { trainingId });
  },

  /**
   * @param {string} trainingId
   */
  trainingReopen(trainingId) {
    writeAudit(DOMAIN, 'Тренировка открыта', { trainingId });
  },

  /**
   * @param {Record<string, unknown>} training
   */
  bookSelf(training) {
    const bookedUsers = getBookedUsers(training);

    writeAudit(DOMAIN, 'Запись на тренировку', {
      trainingId: getTrainingId(training),
      date: training.date,
      slotsUsed: bookedUsers.length,
      maxSlots: getMaxSlots(training)
    });
  },

  /**
   * @param {Record<string, unknown>} training
   */
  cancelBookingSelf(training) {
    writeAudit(DOMAIN, 'Отмена записи', {
      trainingId: getTrainingId(training),
      date: training.date
    });
  },

  /**
   * @param {Record<string, unknown>} training
   * @param {string} targetUserId
   */
  bookUser(training, targetUserId) {
    const bookedUsers = getBookedUsers(training);

    writeAudit(DOMAIN, 'Модератор записал игрока', {
      trainingId: getTrainingId(training),
      date: training.date,
      targetUserId,
      slotsUsed: bookedUsers.length,
      maxSlots: getMaxSlots(training)
    });
  },

  /**
   * @param {Record<string, unknown>} training
   * @param {string[]} userIds
   */
  bookUsers(training, userIds) {
    const targetUserIds = Array.from(new Set(userIds.filter(Boolean)));

    writeAudit(DOMAIN, 'Модератор записал нескольких', {
      trainingId: getTrainingId(training),
      date: training.date,
      addedCount: targetUserIds.length,
      targetUserIds
    });
  },

  /**
   * @param {Record<string, unknown>} training
   * @param {string} targetUserId
   */
  markAttendance(training, targetUserId) {
    writeAudit(DOMAIN, 'Отмечена явка', {
      trainingId: getTrainingId(training),
      date: training.date,
      targetUserId
    });
  },

  /**
   * @param {Record<string, unknown>} training
   * @param {string} targetUserId
   */
  unmarkAttendance(training, targetUserId) {
    writeAudit(DOMAIN, 'Явка отменена', {
      trainingId: getTrainingId(training),
      date: training.date,
      targetUserId
    });
  },

  /**
   * @param {unknown} err
   */
  trainingCreateError(err) {
    writeAuditError(DOMAIN, 'Ошибка создания тренировки', err);
  },

  /**
   * @param {unknown} err
   * @param {string} trainingId
   */
  trainingEditError(err, trainingId) {
    writeAuditError(DOMAIN, 'Ошибка редактирования тренировки', err, { trainingId });
  },

  /**
   * @param {unknown} err
   * @param {string} trainingId
   */
  trainingDeleteError(err, trainingId) {
    writeAuditError(DOMAIN, 'Ошибка удаления тренировки', err, { trainingId });
  },

  /**
   * @param {unknown} err
   * @param {string} trainingId
   */
  trainingStatusError(err, trainingId) {
    writeAuditError(DOMAIN, 'Ошибка изменения статуса тренировки', err, { trainingId });
  },

  /**
   * @param {unknown} err
   * @param {string} trainingId
   */
  bookError(err, trainingId) {
    writeAuditError(DOMAIN, 'Ошибка записи', err, { trainingId });
  }
};
