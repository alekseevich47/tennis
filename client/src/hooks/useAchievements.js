// @ts-check
import useSWR from 'swr';
import pb from '../services/pb';
import { getMediaUrl } from '../lib/media';
import { listAchievements, getUserAchievements, calcNextLevel } from '../services/achievements';

/**
 * @typedef {import('../services/achievements').AchievementRecord} AchievementRecord
 * @typedef {import('../services/achievements').AchievementLevelRecord} AchievementLevelRecord
 */

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
 * @param {string | null | undefined} userId
 */
export function useAchievements(userId) {
  return useSWR(userId ? ['achievements', userId] : null, async ([, id]) => {
    const [achievements, user] = await Promise.all([
      listAchievements(),
      pb.collection('users').getOne(id, {
        fields: 'id,rating_points,wins,attendance_count',
        requestKey: null
      })
    ]);

    const progressMap = getUserAchievements(id, achievements, user);

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
        levels: levels.map((levelRecord) => ({
          level: levelRecord.level ?? 0,
          title: levelRecord.title || '',
          required_value: levelRecord.required_value ?? 0,
          achieved: currentLevel > 0 && (levelRecord.level ?? 0) <= currentLevel,
          icon_url: getMediaUrl(levelRecord, 'achievement_levels', levelRecord.icon) || ''
        }))
      };
    });
  });
}
