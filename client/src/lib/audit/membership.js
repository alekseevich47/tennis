import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'АБОНЕМЕНТ';

export const auditMembership = {
  sessionsAdded(userId, amount, newTotal) {
    writeAudit(DOMAIN, 'Добавлены посещения', {
      targetUserId: userId,
      addedAmount: amount,
      newAvailableSessions: newTotal
    });
  },

  sessionsSubtracted(userId, amount, newTotal) {
    writeAudit(DOMAIN, 'Уменьшены посещения', {
      targetUserId: userId,
      subtractedAmount: amount,
      newAvailableSessions: newTotal
    });
  },

  sessionsAddError(err, userId) {
    writeAuditError(DOMAIN, 'Ошибка добавления посещений', err, { targetUserId: userId });
  },

  sessionsSubtractError(err, userId) {
    writeAuditError(DOMAIN, 'Ошибка уменьшения посещений', err, { targetUserId: userId });
  }
};
