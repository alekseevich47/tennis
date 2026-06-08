import React, { useMemo } from 'react';
import { useAchievements } from '../hooks/useAchievements';

function hashUnit(seed) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function clampPercent(value) {
  return Math.max(6, Math.min(94, value));
}

/**
 * Детерминированное распределение иконок по виртуальной сетке hero.
 * @param {number} count
 * @returns {{ left: number, top: number, durationX: number, durationY: number, delayX: number, delayY: number }[]}
 */
function computeGridLayout(count) {
  const positions = [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const offsetX = (hashUnit(i * 37 + 11) - 0.5) * 0.55;
    const offsetY = (hashUnit(i * 53 + 17) - 0.5) * 0.55;

    positions.push({
      left: clampPercent(((col + 0.5 + offsetX) / cols) * 100),
      top: clampPercent(((row + 0.5 + offsetY) / rows) * 100),
      durationX: 5 + (i % 3) * 0.5,
      durationY: 7 + (i % 4) * 0.5,
      delayX: (i * 0.7) % 2.5,
      delayY: (i * 1.1) % 3.5
    });
  }

  return positions;
}

/**
 * @param {{ userId?: string | null }} props
 */
function FloatingAchievements({ userId }) {
  const { data, isLoading } = useAchievements(userId);

  const achievedIcons = useMemo(() => {
    if (!data) return [];
    const icons = [];
    for (const achievement of data) {
      for (const level of achievement.levels) {
        if (level.achieved && level.icon_url) {
          icons.push(level.icon_url);
        }
      }
    }
    return icons;
  }, [data]);

  const layout = useMemo(
    () => computeGridLayout(achievedIcons.length),
    [achievedIcons.length]
  );

  if (!userId || isLoading || achievedIcons.length === 0) {
    return null;
  }

  return (
    <div className="floating-achievements" aria-hidden="true">
      {achievedIcons.map((iconUrl, index) => {
        const pos = layout[index];
        return (
          <span
            key={`${iconUrl}-${index}`}
            className="floating-achievement-wrap"
            style={{
              left: `calc(${pos.left}% - 16px)`,
              top: `calc(${pos.top}% - 16px)`,
              '--float-x-duration': `${pos.durationX}s`,
              '--float-y-duration': `${pos.durationY}s`,
              '--float-delay-x': `${pos.delayX}s`,
              '--float-delay-y': `${pos.delayY}s`
            }}
          >
            <img src={iconUrl} alt="" className="floating-achievement-icon" />
          </span>
        );
      })}
    </div>
  );
}

export default FloatingAchievements;
