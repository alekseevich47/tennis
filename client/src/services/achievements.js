// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { getAchievementLevelIconUrl } from './achievementIcons';

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

/**
 * @typedef {Object} TournamentPlaceStats
 * @property {number} podiumCount
 * @property {number} firstPlaceCount
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
 * Опубликованные турнирные посты — только participants для агрегата мест.
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array<{ id: string, participants?: Array<{ userId?: string, place?: number }> }>>}
 */
export async function listTournamentPostsForAchievements({ signal } = {}) {
  try {
    const base = '(is_deleted = false || is_deleted = null)';
    const scheduled = 'is_scheduled != true';
    return /** @type {Array<{ id: string, participants?: Array<{ userId?: string, place?: number }> }>} */ (
      await pb.collection('tournament_posts').getFullList({
        filter: `(${base}) && (${scheduled})`,
        fields: 'id,participants',
        requestKey: null,
        signal
      })
    );
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === 'AbortError') return [];
    error('Ошибка загрузки турниров для достижений:', err);
    throw err;
  }
}

/**
 * @param {AchievementRecord} achievement
 * @returns {AchievementLevelRecord[]}
 */
export function getAchievementLevels(achievement) {
  const expand = /** @type {Record<string, unknown> | undefined} */ (achievement.expand);
  const levels = expand?.achievement_levels_via_achievement ?? [];
  if (!Array.isArray(levels)) return [];
  return /** @type {AchievementLevelRecord[]} */ ([...levels]).sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0)
  );
}

/**
 * @param {number} sortOrder
 * @param {number} level
 * @returns {string}
 */
export function getLevelIconUrl(sortOrder, level) {
  return getAchievementLevelIconUrl(sortOrder, level);
}

/**
 * @param {Array<{ participants?: Array<{ userId?: string, place?: number }> }>} posts
 * @param {string} userId
 * @returns {TournamentPlaceStats}
 */
export function countUserTournamentPlaces(posts, userId) {
  let podiumCount = 0;
  let firstPlaceCount = 0;

  for (const post of posts) {
    const participants = Array.isArray(post.participants) ? post.participants : [];
    const mine = participants.find((p) => p && p.userId === userId);
    if (!mine) continue;
    const place = Number(mine.place);
    if (!Number.isFinite(place) || place < 1) continue;
    if (place === 1) firstPlaceCount += 1;
    if (place <= 3) podiumCount += 1;
  }

  return { podiumCount, firstPlaceCount };
}

/**
 * @param {AchievementLevelRecord[]} levels
 * @param {number} value
 * @param {number} [sortOrder]
 * @returns {UserAchievementProgress}
 */
function calcLevelFromValue(levels, value, sortOrder = 0) {
  const sorted = [...levels].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));

  for (const levelRecord of sorted) {
    const required = levelRecord.required_value ?? 0;
    if (value >= required) {
      const level = levelRecord.level ?? 0;
      return {
        achieved: true,
        level,
        title: levelRecord.title || '',
        required_value: required,
        icon_url: getLevelIconUrl(sortOrder, level)
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
  return calcLevelFromValue(levels, ratingPoints ?? 0, 4);
}

/**
 * @param {number} firstPlaceCount
 * @param {AchievementLevelRecord[]} levels
 * @returns {UserAchievementProgress}
 */
export function calcWinsAchievement(firstPlaceCount, levels) {
  return calcLevelFromValue(levels, firstPlaceCount ?? 0, 5);
}

/**
 * @param {number} attendanceCount
 * @param {AchievementLevelRecord[]} levels
 * @returns {UserAchievementProgress}
 */
export function calcAttendanceAchievement(attendanceCount, levels) {
  return calcLevelFromValue(levels, attendanceCount ?? 0, 1);
}

/**
 * @param {number} podiumCount
 * @param {AchievementLevelRecord[]} levels
 * @returns {UserAchievementProgress}
 */
export function calcPodiumAchievement(podiumCount, levels) {
  return calcLevelFromValue(levels, podiumCount ?? 0, 3);
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
 * @param {TournamentPlaceStats} [tournamentStats]
 * @returns {{ progress: UserAchievementProgress, userValue: number }}
 */
function calcAchievementProgress(sortOrder, user, levels, tournamentStats) {
  const podiumCount = tournamentStats?.podiumCount ?? 0;
  const firstPlaceCount = tournamentStats?.firstPlaceCount ?? 0;

  switch (sortOrder) {
    case 1:
      return {
        progress: calcAttendanceAchievement(Number(user.attendance_count) || 0, levels),
        userValue: Number(user.attendance_count) || 0
      };
    case 2:
      // Серия побед — matches удалены; метрика пока недоступна.
      return { progress: calcUnavailableAchievement(), userValue: 0 };
    case 3:
      return {
        progress: calcPodiumAchievement(podiumCount, levels),
        userValue: podiumCount
      };
    case 4:
      return {
        progress: calcRatingAchievement(Number(user.rating_points) || 0, levels),
        userValue: Number(user.rating_points) || 0
      };
    case 5:
      return {
        progress: calcWinsAchievement(firstPlaceCount, levels),
        userValue: firstPlaceCount
      };
    default:
      return { progress: calcUnavailableAchievement(), userValue: 0 };
  }
}

/**
 * @param {string} userId
 * @param {AchievementRecord[]} achievements
 * @param {Record<string, unknown>} user
 * @param {TournamentPlaceStats} [tournamentStats]
 * @returns {Map<string, UserAchievementResult>}
 */
export function getUserAchievements(userId, achievements, user, tournamentStats) {
  /** @type {Map<string, UserAchievementResult>} */
  const result = new Map();

  for (const achievement of achievements) {
    const levels = getAchievementLevels(achievement);
    const sortOrder = Number(achievement.sort_order) || 0;
    const { progress, userValue } = calcAchievementProgress(
      sortOrder,
      user,
      levels,
      tournamentStats
    );

    result.set(achievement.id, { progress, userValue });
  }

  return result;
}
