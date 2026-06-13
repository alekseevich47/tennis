// @ts-check
import { getActor, writeAudit, writeAuditError } from './core';

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
    const actor = getActor();

    writeAudit(DOMAIN, 'Профиль отредактирован', {
      targetUserId: userId,
      changedFields: getChangedFields(patch),
      editedByModerator: actor.role === 'МОДЕРАТОР' && actor.userId !== userId
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
  },

  /**
   * @param {string} targetUserId
   */
  userHidden(targetUserId) {
    const actor = getActor();

    writeAudit(DOMAIN, 'Пользователь скрыт из рейтинга', {
      targetUserId,
      hiddenBy: actor.userId,
      hiddenByName: actor.userFullName
    });
  },

  /**
   * @param {string} targetUserId
   */
  userRevealed(targetUserId) {
    const actor = getActor();

    writeAudit(DOMAIN, 'Пользователь возвращён в рейтинг', {
      targetUserId,
      revealedBy: actor.userId,
      revealedByName: actor.userFullName
    });
  },

  /**
   * @param {string} targetUserId
   * @param {string} reason
   */
  userBanned(targetUserId, reason) {
    const actor = getActor();

    writeAudit(DOMAIN, 'Пользователь заблокирован', {
      targetUserId,
      reason,
      bannedBy: actor.userId,
      bannedByName: actor.userFullName
    });
  },

  /**
   * @param {string} targetUserId
   */
  userUnbanned(targetUserId) {
    const actor = getActor();

    writeAudit(DOMAIN, 'Пользователь разблокирован', {
      targetUserId,
      unbannedBy: actor.userId,
      unbannedByName: actor.userFullName
    });
  },

  /**
   * @param {string} targetUserId
   * @param {string} reason
   */
  commentsRestricted(targetUserId, reason) {
    const actor = getActor();

    writeAudit(DOMAIN, 'Комментарии ограничены', {
      targetUserId,
      reason,
      restrictedBy: actor.userId,
      restrictedByName: actor.userFullName
    });
  },

  /**
   * @param {string} targetUserId
   */
  commentsUnrestricted(targetUserId) {
    const actor = getActor();

    writeAudit(DOMAIN, 'Ограничение комментариев снято', {
      targetUserId,
      unrestrictedBy: actor.userId,
      unrestrictedByName: actor.userFullName
    });
  }
};
