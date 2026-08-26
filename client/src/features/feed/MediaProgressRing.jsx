import React from 'react';

const RING_R = 14.5;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Кольцо прогресса как в fullscreen ленты — без цифр.
 * @param {{ progress?: number | null, className?: string, label?: string }} props
 */
export default function MediaProgressRing({
  progress = null,
  className = '',
  label = 'Загрузка'
}) {
  const determinate = typeof progress === 'number' && progress > 0 && progress < 100;
  const pct = determinate ? Math.min(99, Math.max(0, progress)) : null;

  return (
    <span
      className={className ? `media-progress-ring ${className}` : 'media-progress-ring'}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
    >
      {pct != null ? (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle className="media-progress-ring__track" cx="18" cy="18" r={RING_R} />
          <circle
            className="media-progress-ring__value"
            cx="18"
            cy="18"
            r={RING_R}
            style={{
              strokeDasharray: `${RING_C} ${RING_C}`,
              strokeDashoffset: RING_C * (1 - pct / 100)
            }}
          />
        </svg>
      ) : (
        <span className="media-progress-ring__spin" aria-hidden="true" />
      )}
    </span>
  );
}
