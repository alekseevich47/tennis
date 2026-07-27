// @ts-check
import pb from './pb';

/** @typedef {{ start: string, end: string }} StatsDateRange */

/** @typedef {{ date: string, count: number, cumulative: number }} StatsGrowthPoint */

/** @typedef {{
 *   booked: number,
 *   cancelledTotal: number,
 *   cancelledSelf: number,
 *   cancelledModerator: number,
 *   cancelledSystem: number,
 *   attended: number,
 *   missed: number
 * }} StatsBookingCounters */

/** @typedef {{
 *   userId: string,
 *   fullName: string,
 *   group: StatsBookingCounters,
 *   tournament: StatsBookingCounters,
 *   total: StatsBookingCounters
 * }} StatsBookingUser */

/**
 * @param {StatsDateRange} range
 */
function periodQuery({ start, end }) {
  return { start, end };
}

/**
 * @param {StatsDateRange} range
 * @returns {Promise<{ points: StatsGrowthPoint[], total: number }>}
 */
export async function fetchStatsGrowth(range) {
  return pb.send('/api/stats/growth', {
    method: 'GET',
    query: periodQuery(range)
  });
}

/**
 * @param {StatsDateRange} range
 * @returns {Promise<{
 *   viewsTotal: number,
 *   activeCount: number,
 *   passiveCount: number,
 *   totalUsers: number,
 *   byType: {
 *     post: { viewsTotal: number, activeCount: number, passiveCount: number },
 *     tournament_post: { viewsTotal: number, activeCount: number, passiveCount: number }
 *   },
 *   topPosts: Array<{ object_type: string, object_id: string, views: number, post_number?: number | null }>
 * }>}
 */
export async function fetchStatsReach(range) {
  return pb.send('/api/stats/reach', {
    method: 'GET',
    query: periodQuery(range)
  });
}

/**
 * Drill-down: активные / пассивные пользователи охвата.
 * @param {StatsDateRange} range
 * @param {{
 *   kind: 'active' | 'passive',
 *   scope?: 'all' | 'post' | 'tournament_post'
 * }} params
 * @returns {Promise<{
 *   kind: 'active' | 'passive',
 *   scope: 'all' | 'post' | 'tournament_post',
 *   count: number,
 *   users: Array<{
 *     id: string,
 *     collectionId?: string,
 *     collectionName?: string,
 *     full_name: string,
 *     birth_date?: string,
 *     avatar?: string,
 *     avatar_url?: string,
 *     created?: string,
 *     views: number
 *   }>
 * }>}
 */
export async function fetchStatsReachUsers(range, { kind, scope = 'all' }) {
  return pb.send('/api/stats/reach/users', {
    method: 'GET',
    query: { ...periodQuery(range), kind, scope }
  });
}

/**
 * @param {StatsDateRange} range
 * @returns {Promise<{ users: StatsBookingUser[] }>}
 */
export async function fetchStatsBooking(range) {
  return pb.send('/api/stats/booking', {
    method: 'GET',
    query: periodQuery(range)
  });
}

/**
 * @param {StatsDateRange} range
 * @returns {Promise<{
 *   total: number,
 *   group: number,
 *   tournament: number,
 *   byDay: Array<{ date: string, group: number, tournament: number, total: number }>
 * }>}
 */
export async function fetchStatsTrainingsCount(range) {
  return pb.send('/api/stats/trainings-count', {
    method: 'GET',
    query: periodQuery(range)
  });
}

/**
 * @param {string} date YYYY-MM-DD
 * @returns {Promise<{ date: string, users: Array<{
 *   id: string,
 *   collectionId?: string,
 *   collectionName?: string,
 *   full_name: string,
 *   birth_date?: string,
 *   avatar?: string,
 *   avatar_url?: string,
 *   created?: string
 * }> }>}
 */
export async function fetchStatsGrowthDay(date) {
  return pb.send('/api/stats/growth/day', {
    method: 'GET',
    query: { date }
  });
}

/**
 * @param {string} date YYYY-MM-DD
 * @returns {Promise<{ date: string, trainings: Array<{
 *   id: string,
 *   date: string,
 *   duration: number,
 *   type: string,
 *   booked_users: string[],
 *   is_cancelled: boolean,
 *   is_closed?: boolean,
 *   is_deleted?: boolean,
 *   max_slots?: number | null
 * }> }>}
 */
export async function fetchStatsTrainingsDay(date) {
  return pb.send('/api/stats/trainings-count/day', {
    method: 'GET',
    query: { date }
  });
}

/**
 * Режим «сейчас» — период не нужен.
 * @returns {Promise<{
 *   achievements: Array<{
 *     id: string,
 *     name: string,
 *     sortOrder: number,
 *     levels: Array<{
 *       level: number,
 *       title: string,
 *       requiredValue: number,
 *       count: number,
 *       users: Array<{ id: string, fullName: string }>
 *     }>
 *   }>
 * }>}
 */
export async function fetchStatsAchievements() {
  return pb.send('/api/stats/achievements', {
    method: 'GET'
  });
}

/**
 * @param {StatsDateRange} range
 * @returns {Promise<{
 *   achievements: Array<{
 *     id: string,
 *     name: string,
 *     levels: Array<{
 *       level: number,
 *       title: string,
 *       count: number,
 *       users: Array<{ id: string, fullName: string, grantedAt?: string }>
 *     }>
 *   }>
 * }>}
 */
export async function fetchStatsAchievementGrants(range) {
  return pb.send('/api/stats/achievements/grants', {
    method: 'GET',
    query: periodQuery(range)
  });
}

/**
 * Запись просмотра (auth). Без дедупа — каждое срабатывание = отдельная запись.
 * @param {{
 *   objectType: 'post' | 'tournament_post',
 *   objectId: string,
 *   source?: 'viewport' | 'modal' | ''
 * }} params
 * @returns {Promise<{ ok: boolean, id: string }>}
 */
export async function recordContentView({ objectType, objectId, source = '' }) {
  /** @type {Record<string, string>} */
  const body = {
    object_type: objectType,
    object_id: objectId
  };
  if (source) body.source = source;

  return pb.send('/api/content-view', {
    method: 'POST',
    body
  });
}
