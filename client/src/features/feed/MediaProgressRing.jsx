import React from 'react';

const RING_R = 14.5;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Кольцо прогресса с цифрой % в центре.
 * @param {{ progress?: number | null, className?: string, label?: string, showLabel?: boolean }} props
 */
export default function MediaProgressRing({
  progress = null,
  className = '',
  label = 'Загрузка',
  showLabel = true
}) {
  const determinate = typeof progress === 'number' && progress > 0 && progress < 100;
  const pct = determinate ? Math.min(99, Math.max(0, Math.round(progress))) : null;
  const displayPct =
    typeof progress === 'number' && progress >= 100 ? 100 : pct;

  return (
    <span
      className={className ? `media-progress-ring ${className}` : 'media-progress-ring'}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayPct ?? undefined}
    >
      {displayPct != null ? (
        <>
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle className="media-progress-ring__track" cx="18" cy="18" r={RING_R} />
            <circle
              className="media-progress-ring__value"
              cx="18"
              cy="18"
              r={RING_R}
              style={{
                strokeDasharray: `${RING_C} ${RING_C}`,
                strokeDashoffset: RING_C * (1 - displayPct / 100)
              }}
            />
          </svg>
          {showLabel ? (
            <span className="media-progress-ring__label" aria-hidden="true">
              {displayPct}%
            </span>
          ) : null}
        </>
      ) : (
        <span className="media-progress-ring__spin" aria-hidden="true" />
      )}
    </span>
  );
}
