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
 * @param {number} value
 */
function clampProgress(value) {
  return Math.max(0, Math.min(100, value));
}

/**
 * @param {number} progressPercent
 */
function getProgressBarColorClass(progressPercent) {
  if (progressPercent < 30) return 'achievement-progress-bar--low';
  if (progressPercent <= 70) return 'achievement-progress-bar--mid';
  return 'achievement-progress-bar--high';
}

/**
 * @param {{ achievement: import('../hooks/useAchievements').AchievementWithProgress }} props
 */
function AchievementRow({ achievement }) {
  const currentTitle = getCurrentLevelTitle(achievement.levels);
  const { nextLevel, userValue = 0 } = achievement;
  const progressPercent = nextLevel
    ? clampProgress(
        ((userValue - nextLevel.prevRequired) /
          Math.max(1, nextLevel.nextRequired - nextLevel.prevRequired)) *
          100
      )
    : 100;
  const progressText = nextLevel ? `${userValue} / ${nextLevel.nextRequired}` : 'Максимум';
  const progressBarColorClass = getProgressBarColorClass(progressPercent);

  return (
    <div className="achievement-row">
      <p className="achievement-name">{achievement.name}</p>
      {currentTitle ? (
        <span className="achievement-current-level">Текущий уровень: {currentTitle}</span>
      ) : (
        <span className="achievement-current-level achievement-current-level--none">
          Уровень не достигнут
        </span>
      )}
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
            <span className="achievement-medal-value">{level.required_value}</span>
          </div>
        ))}
      </div>

      <div className="achievement-progress">
        <div className="achievement-progress-bar-wrap">
          <div
            className={clsx('achievement-progress-bar', progressBarColorClass)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="achievement-progress-text">{progressText}</span>
      </div>
    </div>
  );
}

/**
 * @param {{ userId?: string | null, className?: string, collapsible?: boolean }} props
 */
function AchievementsBlock({ userId, className, collapsible = false }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, error } = useAchievements(userId);

  if (!userId) return null;

  const count = !isLoading && !error && data ? data.length : null;

  const header = collapsible ? (
    <button
      type="button"
      className="profile-achievements-toggle"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      <h3>Достижения{count !== null ? ` (${count})` : ''}</h3>
      <span className="profile-achievements-arrow" aria-hidden="true">
        {expanded ? '▲' : '▼'}
      </span>
    </button>
  ) : (
    <h3>Достижения</h3>
  );

  const renderContent = () => {
    if (isLoading) {
      return <Spinner label="Загрузка достижений..." inline />;
    }
    if (error || !data?.length) {
      return <p className="no-data-text">Не удалось загрузить достижения</p>;
    }
    return (
      <div className="achievements-list">
        {data.map((achievement) => (
          <AchievementRow key={achievement.id} achievement={achievement} />
        ))}
      </div>
    );
  };

  return (
    <div className={clsx('profile-achievements-block', className)}>
      {header}
      {(!collapsible || expanded) && renderContent()}
    </div>
  );
}

export default AchievementsBlock;
