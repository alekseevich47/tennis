// @ts-check
import pb from '../../services/pb';
import { writeAudit, writeAuditError } from './core';

const DOMAIN = 'ДОСТИЖЕНИЯ';
const ACHIEVEMENT_UNLOCKED_ACTION = 'Достижение получено';

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isNotFoundError(err) {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    /** @type {{ status?: number }} */ (err).status === 404
  );
}

export const auditAchievements = {
  /**
   * @param {string} achievementId
   * @param {string} achievementName
   * @param {number} level
   * @param {string} levelTitle
   * @param {number} requiredValue
   * @param {number} userValue
   * @param {string} userId
   */
  async achievementUnlocked(achievementId, achievementName, level, levelTitle, requiredValue, userValue, userId) {
    try {
      await pb.collection('audit_logs').getFirstListItem(
        pb.filter(
          'user = {:userId} && domain = {:domain} && action = {:action} && details.achievementId = {:achievementId} && details.level = {:level}',
          {
            userId,
            domain: DOMAIN,
            action: ACHIEVEMENT_UNLOCKED_ACTION,
            achievementId,
            level
          }
        ),
        { requestKey: null }
      );
      return;
    } catch (err) {
      if (!isNotFoundError(err)) {
        console.warn('Ошибка проверки audit_logs:', err);
        return;
      }
    }

    writeAudit(DOMAIN, ACHIEVEMENT_UNLOCKED_ACTION, {
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
