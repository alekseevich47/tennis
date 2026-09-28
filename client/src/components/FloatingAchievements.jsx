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
 * Доля радиуса эллипса safe-zone (аватар + запас) в % от hero.
 * Позиции внутри зоны отбрасываются — иконки не прячутся под аватаром.
 */
const SAFE_ZONE_RX = 28;
const SAFE_ZONE_RY = 34;
const SAFE_ZONE_CX = 50;
const SAFE_ZONE_CY = 38;

/**
 * @param {number} left
 * @param {number} top
 */
function isInsideSafeZone(left, top) {
  const nx = (left - SAFE_ZONE_CX) / SAFE_ZONE_RX;
  const ny = (top - SAFE_ZONE_CY) / SAFE_ZONE_RY;
  return nx * nx + ny * ny < 1;
}

/**
 * Детерминированное распределение иконок по виртуальной сетке hero вне safe-zone.
 * @param {number} count
 * @returns {{ left: number, top: number, durationX: number, durationY: number, delayX: number, delayY: number }[]}
 */
function computeGridLayout(count) {
  if (count <= 0) return [];

  const positions = [];
  const candidates = [];
  const cols = Math.max(3, Math.ceil(Math.sqrt(count * 2.2)));
  const rows = Math.max(3, Math.ceil((count * 2.2) / cols));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const offsetX = (hashUnit(i * 37 + 11) - 0.5) * 0.45;
      const offsetY = (hashUnit(i * 53 + 17) - 0.5) * 0.45;
      const left = clampPercent(((col + 0.5 + offsetX) / cols) * 100);
      const top = clampPercent(((row + 0.5 + offsetY) / rows) * 100);
      if (isInsideSafeZone(left, top)) continue;
      candidates.push({
        left,
        top,
        durationX: 5 + (i % 3) * 0.5,
        durationY: 7 + (i % 4) * 0.5,
        delayX: (i * 0.7) % 2.5,
        delayY: (i * 1.1) % 3.5,
        order: hashUnit(i * 71 + 3)
      });
    }
  }

  candidates.sort((a, b) => a.order - b.order);

  for (let i = 0; i < count; i++) {
    const base = candidates[i % Math.max(1, candidates.length)];
    if (!base) {
      const angle = (i / count) * Math.PI * 2;
      positions.push({
        left: clampPercent(SAFE_ZONE_CX + Math.cos(angle) * (SAFE_ZONE_RX + 12)),
        top: clampPercent(SAFE_ZONE_CY + Math.sin(angle) * (SAFE_ZONE_RY + 10)),
        durationX: 5 + (i % 3) * 0.5,
        durationY: 7 + (i % 4) * 0.5,
        delayX: (i * 0.7) % 2.5,
        delayY: (i * 1.1) % 3.5
      });
      continue;
    }
    const jitter = i >= candidates.length ? (hashUnit(i * 19 + 5) - 0.5) * 6 : 0;
    positions.push({
      left: clampPercent(base.left + jitter),
      top: clampPercent(base.top + jitter * 0.6),
      durationX: base.durationX,
      durationY: base.durationY,
      delayX: base.delayX,
      delayY: base.delayY
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
