import React, { useState } from 'react';
import clsx from 'clsx';
import { useAchievements } from '../hooks/useAchievements';
import Spinner from './ui/Spinner';

/**
 * @param {{ level: number, title: string, required_value: number, achieved: boolean, icon_url: string }[]} levels
 * @returns {string | null}
 */
function getCurrentLevelTitle(levels) {
  const achieved = levels.filter((l) => l.achieved);
  if (achieved.length === 0) return null;
  return achieved[achieved.length - 1].title;
}

/**
 * @param {{ achievement: import('../hooks/useAchievements').AchievementWithProgress }} props
 */
function AchievementRow({ achievement }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const currentTitle = getCurrentLevelTitle(achievement.levels);
  const tooltipText = currentTitle
    ? `Текущий уровень: ${currentTitle}`
    : 'Уровень не достигнут';

  const isTouch =
    typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

  const handleMouseEnter = () => {
    if (!isTouch) setTooltipOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isTouch) setTooltipOpen(false);
  };

  const handleClick = () => {
    if (isTouch) setTooltipOpen((v) => !v);
  };

  return (
    <div
      className={clsx('achievement-row', tooltipOpen && 'achievement-row--tooltip-open')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <p className="achievement-name">{achievement.name}</p>
      {achievement.description ? (
        <p className="achievement-description">{achievement.description}</p>
      ) : null}

      <div className="achievement-medals">
        {achievement.levels.map((level) => (
          <div
            key={level.level}
            className={clsx('achievement-medal', !level.achieved && 'achievement-medal--locked')}
          >
            {level.icon_url ? (
              <img src={level.icon_url} alt="" aria-hidden="true" />
            ) : (
              <span className="achievement-medal-placeholder" aria-hidden="true" />
            )}
            <span className="achievement-medal-level">{level.level}</span>
          </div>
        ))}
      </div>

      <div className="achievement-tooltip" role="tooltip">
        {tooltipText}
      </div>
    </div>
  );
}

/**
 * @param {{ userId?: string | null, className?: string }} props
 */
function AchievementsBlock({ userId, className }) {
  const { data, isLoading, error } = useAchievements(userId);

  if (!userId) return null;

  if (isLoading) {
    return (
      <div className={clsx('profile-achievements-block', className)}>
        <h3>Достижения</h3>
        <Spinner label="Загрузка достижений..." inline />
      </div>
    );
  }

  if (error || !data?.length) {
    return (
      <div className={clsx('profile-achievements-block', className)}>
        <h3>Достижения</h3>
        <p className="no-data-text">Не удалось загрузить достижения</p>
      </div>
    );
  }

  return (
    <div className={clsx('profile-achievements-block', className)}>
      <h3>Достижения</h3>
      <div className="achievements-list">
        {data.map((achievement) => (
          <AchievementRow key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

export default AchievementsBlock;
