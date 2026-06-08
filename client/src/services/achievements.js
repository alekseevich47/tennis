// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { getMediaUrl } from '../lib/media';
import { auditAchievements } from '../lib/audit';

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
 * @typedef {Object} MatchRecord
 * @property {string} id
 * @property {string} [player1]
 * @property {string} [player2]
 * @property {string} [date_time]
 * @property {'scheduled' | 'finished' | 'cancelled'} [status]
 * @property {number} [score_p1]
 * @property {number} [score_p2]
 */

/**
 * @typedef {Object} UserAchievementProgress
 * @property {boolean} achieved
 * @property {number} level
 * @property {string} title
 * @property {number} required_value
 * @property {string} icon_url
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
 * @param {{ userId: string, signal?: AbortSignal }} options
 */
export async function listMatches({ userId, signal } = /** @type {{ userId: string, signal?: AbortSignal }} */ ({})) {
  try {
    return /** @type {MatchRecord[]} */ (await pb.collection('matches').getFullList({
      filter: pb.filter('(player1 = {:userId} || player2 = {:userId}) && status = "finished"', { userId }),
      sort: 'date_time',
      requestKey: null,
      signal
    }));
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка получения матчей:', err);
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
 * @param {MatchRecord} match
 * @param {string} userId
 * @returns {boolean}
 */
function isMatchWin(match, userId) {
  if (match.player1 === userId) {
    return (match.score_p1 ?? 0) > (match.score_p2 ?? 0);
  }
  if (match.player2 === userId) {
    return (match.score_p2 ?? 0) > (match.score_p1 ?? 0);
  }
  return false;
}

/**
 * @param {MatchRecord[]} matches
 * @param {string} userId
 * @returns {number}
 */
function calcMaxWinStreak(matches, userId) {
  const userMatches = matches
    .filter(
      (match) =>
        match.status === 'finished' && (match.player1 === userId || match.player2 === userId)
    )
    .sort((a, b) => new Date(a.date_time || 0).getTime() - new Date(b.date_time || 0).getTime());

  let maxStreak = 0;
  let currentStreak = 0;

  for (const match of userMatches) {
    if (isMatchWin(match, userId)) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * @param {MatchRecord[]} matches
 * @param {string} userId
 * @param {AchievementLevelRecord[]} levels
 * @returns {UserAchievementProgress}
 */
export function calcWinStreakAchievement(matches, userId, levels) {
  return calcLevelFromValue(levels, calcMaxWinStreak(matches, userId));
}

/**
 * @returns {UserAchievementProgress}
 */
export function calcPodiumAchievement() {
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
 * @param {string} userId
 * @param {Record<string, unknown>} user
 * @param {MatchRecord[]} matches
 * @param {AchievementLevelRecord[]} levels
 * @returns {{ progress: UserAchievementProgress, userValue: number }}
 */
function calcAchievementProgress(sortOrder, userId, user, matches, levels) {
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
      return {
        progress: calcWinStreakAchievement(matches, userId, levels),
        userValue: calcMaxWinStreak(matches, userId)
      };
    case 5:
    default:
      return { progress: calcPodiumAchievement(), userValue: 0 };
  }
}

/**
 * @param {string} userId
 * @param {AchievementRecord[]} achievements
 * @param {Record<string, unknown>} user
 * @param {MatchRecord[]} matches
 * @returns {Map<string, UserAchievementProgress>}
 */
export function getUserAchievements(userId, achievements, user, matches) {
  /** @type {Map<string, UserAchievementProgress>} */
  const result = new Map();

  try {
    for (const achievement of achievements) {
      const levels = getAchievementLevels(achievement);
      const sortOrder = Number(achievement.sort_order) || 0;
      const { progress, userValue } = calcAchievementProgress(
        sortOrder,
        userId,
        user,
        matches,
        levels
      );

      result.set(achievement.id, progress);

      if (progress.achieved) {
        auditAchievements.achievementUnlocked(
          achievement.id,
          achievement.name || '',
          progress.level,
          progress.title,
          progress.required_value,
          userValue
        );
      }
    }
  } catch (err) {
    auditAchievements.achievementCalcError(err, userId);
    throw err;
  }

  return result;
}
