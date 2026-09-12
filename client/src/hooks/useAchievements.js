// @ts-check
import useSWR from 'swr';
import pb from '../services/pb';
import {
  listAchievements,
  listTournamentPostsForAchievements,
  getUserAchievements,
  getAchievementLevels,
  calcNextLevel,
  countUserTournamentPlaces,
  getLevelIconUrl
} from '../services/achievements';

/**
 * @typedef {import('../services/achievements').AchievementRecord} AchievementRecord
 * @typedef {import('../services/achievements').AchievementLevelRecord} AchievementLevelRecord
 */

/**
 * @typedef {AchievementRecord & {
 *   userValue: number,
 *   nextLevel: { prevRequired: number, nextRequired: number, level: number } | null,
 *   levels: Array<{
 *     level: number,
 *     title: string,
 *     required_value: number,
 *     achieved: boolean,
 *     icon_url: string
 *   }>
 * }} AchievementWithProgress
 */

/**
 * @param {string | null | undefined} userId
 */
export function useAchievements(userId) {
  return useSWR(userId ? ['achievements', userId] : null, async ([, id]) => {
    const [achievements, user, tournamentPosts] = await Promise.all([
      listAchievements(),
      pb.collection('users').getOne(id, {
        fields: 'id,rating_points,attendance_count',
        requestKey: null
      }),
      listTournamentPostsForAchievements()
    ]);

    const tournamentStats = countUserTournamentPlaces(tournamentPosts, id);
    const progressMap = getUserAchievements(id, achievements, user, tournamentStats);

    return achievements.map((achievement) => {
      const levels = getAchievementLevels(achievement);
      const achievementResult = progressMap.get(achievement.id);
      const progress = achievementResult?.progress;
      const userValue = achievementResult?.userValue ?? 0;
      const currentLevel = progress?.level ?? 0;

      return {
        ...achievement,
        userValue,
        nextLevel: calcNextLevel(levels, userValue),
        levels: levels.map((levelRecord) => {
          const level = levelRecord.level ?? 0;
          return {
            level,
            title: levelRecord.title || '',
            required_value: levelRecord.required_value ?? 0,
            achieved: currentLevel > 0 && level <= currentLevel,
            icon_url: getLevelIconUrl(levelRecord)
          };
        })
      };
    });
  });
}
