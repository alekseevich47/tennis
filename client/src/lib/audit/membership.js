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
  },

  membershipTypeChanged(userId, from, to) {
    writeAudit(DOMAIN, 'Изменён тип абонемента', { targetUserId: userId, from, to });
  },

  membershipFrozen(userId) {
    writeAudit(DOMAIN, 'Абонемент заморожен', { targetUserId: userId });
  },

  membershipUnfrozen(userId) {
    writeAudit(DOMAIN, 'Абонемент разморожен', { targetUserId: userId });
  },

  membershipEdited(userId, changedFields) {
    writeAudit(DOMAIN, 'Абонемент отредактирован', { targetUserId: userId, changedFields });
  }
};
