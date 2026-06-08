// @ts-check
import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'ДОСТИЖЕНИЯ';

export const auditAchievements = {
  /**
   * @param {string} achievementId
   * @param {string} achievementName
   * @param {number} level
   * @param {string} levelTitle
   * @param {number} requiredValue
   * @param {number} userValue
   */
  achievementUnlocked(achievementId, achievementName, level, levelTitle, requiredValue, userValue) {
    writeAudit(DOMAIN, 'Достижение получено', {
      achievementId,
      achievementName,
      level,
      levelTitle,
      requiredValue,
      userValue
    });
  },

  /**
   * @param {unknown} err
   * @param {string} userId
   */
  achievementCalcError(err, userId) {
    writeAuditError(DOMAIN, 'Ошибка расчёта достижений', err, { userId });
  }
};
