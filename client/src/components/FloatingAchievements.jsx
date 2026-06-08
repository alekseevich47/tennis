import React, { useMemo } from 'react';
import { useAchievements } from '../hooks/useAchievements';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Спиральное размещение иконок вокруг центра без пересечений.
 * @param {number} count
 * @returns {{ x: number, y: number, durationX: number, durationY: number, delayX: number, delayY: number }[]}
 */
function computeSpiralLayout(count) {
  const positions = [];

  for (let i = 0; i < count; i++) {
    const t = i + 1;
    const radius = 48 + Math.sqrt(t) * 16;
    const angle = i * GOLDEN_ANGLE;
    const jitterX = ((i * 17) % 13) - 6;
    const jitterY = ((i * 23) % 11) - 5;

    positions.push({
      x: Math.cos(angle) * radius + jitterX,
      y: Math.sin(angle) * radius + jitterY,
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
    () => computeSpiralLayout(achievedIcons.length),
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
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
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
