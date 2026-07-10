// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { getMediaUrl } from '../lib/media';
/**
 * @typedef {Object} AchievementLevelRecord
 * @property {string} id
 * @property {string} [collectionId]
 * @property {string} [collectionName]
 * @property {string} [achievement]
 * @property {number} [level]
 * @property {string} [title]
 * @property {number} [required_value]
 * @property {string | string[]} [icon]
 */

/**
 * @typedef {Object} AchievementRecord
 * @property {string} id
 * @property {string} [name]
 * @property {string} [description]
 * @property {number} [sort_order]
 * @property {Record<string, unknown>} [expand]
 */

/**
 * @typedef {Object} UserAchievementProgress
 * @property {boolean} achieved
 * @property {number} level
 * @property {string} title
 * @property {number} required_value
 * @property {string} icon_url
 */

/**
 * @typedef {Object} UserAchievementResult
 * @property {UserAchievementProgress} progress
 * @property {number} userValue
 */

/** @param {{ signal?: AbortSignal }} [options] */
export async function listAchievements({ signal } = {}) {
  try {
    return /** @type {AchievementRecord[]} */ (await pb.collection('achievements').getFullList({
      sort: 'sort_order',
      expand: 'achievement_levels_via_achievement',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения достижений:', err);
    throw err;
  }
}

/**
 * @param {AchievementRecord} achievement
 * @returns {AchievementLevelRecord[]}
 */
function getAchievementLevels(achievement) {
  const expand = /** @type {Record<string, unknown> | undefined} */ (achievement.expand);
  const levels = expand?.achievement_levels_via_achievement ?? [];
  if (!Array.isArray(levels)) return [];
  return /** @type {AchievementLevelRecord[]} */ ([...levels]).sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0)
  );
}

/**
 * @param {AchievementLevelRecord} levelRecord
 * @returns {string}
 */
function getLevelIconUrl(levelRecord) {
  return getMediaUrl(levelRecord, 'achievement_levels', levelRecord.icon) || '';
}

/**
 * @param {AchievementLevelRecord[]} levels
 * @param {number} value
 * @returns {UserAchievementProgress}
 */
function calcLevelFromValue(levels, value) {
  const sorted = [...levels].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));

  for (const levelRecord of sorted) {
    const required = levelRecord.required_value ?? 0;
    if (value >= required) {
      return {
        achieved: true,
        level: levelRecord.level ?? 0,
        title: levelRecord.title || '',
        required_value: required,
        icon_url: getLevelIconUrl(levelRecord)
      };
    }
  }

  return {
    achieved: false,
    level: 0,
    title: '',
    required_value: 0,
    icon_url: ''
  };
}

/**
 * @param {AchievementLevelRecord[]} levels
 * @param {number} userValue
 * @returns {{ prevRequired: number, nextRequired: number, level: number } | null}
 */
export function calcNextLevel(levels, userValue) {
  let prevRequired = 0;

  for (const levelRecord of levels) {
    const required = levelRecord.required_value ?? 0;
    if (userValue < required) {
      return {
        prevRequired,
        nextRequired: required,
        level: levelRecord.level ?? 0
      };
    }
    prevRequired = required;
  }

  return null;
}

/**
 * @param {number} ratingPoints
 * @param {AchievementLevelRecord[]} levels
 * @returns {UserAchievementProgress}
 */
export function calcRatingAchievement(ratingPoints, levels) {
  return calcLevelFromValue(levels, ratingPoints ?? 0);
}

/**
 * @param {number} wins
 * @param {AchievementLevelRecord[]} levels
 * @returns {UserAchievementProgress}
 */
export function calcWinsAchievement(wins, levels) {
  return calcLevelFromValue(levels, wins ?? 0);
}

/**
 * @param {number} attendanceCount
 * @param {AchievementLevelRecord[]} levels
 * @returns {UserAchievementProgress}
 */
export function calcAttendanceAchievement(attendanceCount, levels) {
  return calcLevelFromValue(levels, attendanceCount ?? 0);
}

/**
 * @returns {UserAchievementProgress}
 */
function calcUnavailableAchievement() {
  return {
    achieved: false,
    level: 0,
    title: '',
    required_value: 0,
    icon_url: ''
  };
}

/**
 * @param {number} sortOrder
 * @param {Record<string, unknown>} user
 * @param {AchievementLevelRecord[]} levels
 * @returns {{ progress: UserAchievementProgress, userValue: number }}
 */
function calcAchievementProgress(sortOrder, user, levels) {
  switch (sortOrder) {
    case 1:
      return {
        progress: calcRatingAchievement(Number(user.rating_points) || 0, levels),
        userValue: Number(user.rating_points) || 0
      };
    case 2:
      return {
        progress: calcWinsAchievement(Number(user.wins) || 0, levels),
        userValue: Number(user.wins) || 0
      };
    case 3:
      return {
        progress: calcAttendanceAchievement(Number(user.attendance_count) || 0, levels),
        userValue: Number(user.attendance_count) || 0
      };
    case 4:
      // Серия побед — раньше считалась по matches (коллекция удалена).
      return { progress: calcUnavailableAchievement(), userValue: 0 };
    case 5:
      // Призовой пьедестал — по tournament_posts (пока не реализовано).
      return { progress: calcUnavailableAchievement(), userValue: 0 };
    default:
      return { progress: calcUnavailableAchievement(), userValue: 0 };
  }
}

/**
 * @param {string} userId
 * @param {AchievementRecord[]} achievements
 * @param {Record<string, unknown>} user
 * @returns {Map<string, UserAchievementResult>}
 */
export function getUserAchievements(userId, achievements, user) {
  /** @type {Map<string, UserAchievementResult>} */
  const result = new Map();

  try {
    for (const achievement of achievements) {
      const levels = getAchievementLevels(achievement);
      const sortOrder = Number(achievement.sort_order) || 0;
      const { progress, userValue } = calcAchievementProgress(sortOrder, user, levels);

      result.set(achievement.id, { progress, userValue });
    }
  } catch (err) {
    throw err;
  }

  return result;
}
