import React from 'react';
import clsx from 'clsx';

/**
 * Кнопка календаря с красной точкой (очередь запланированных публикаций).
 *
 * @param {{
 *   onClick: () => void,
 *   count?: number,
 *   className?: string,
 *   disabled?: boolean
 * }} props
 */
export default function PostScheduleButton({
  onClick,
  count = 0,
  className = '',
  disabled = false
}) {
  return (
    <button
      type="button"
      className={clsx('create-post-attach-btn create-post-schedule-btn', className)}
      disabled={disabled}
      aria-label={
        count > 0
          ? `Запланированные публикации: ${count}`
          : 'Запланированные публикации'
      }
      onClick={onClick}
    >
      <svg
        className="create-post-attach-btn__icon create-post-schedule-btn__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M7 3.5v3M17 3.5v3M4.5 8.5h15M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 12.2h3.2M8 15.5h5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {count > 0 ? (
        <span className="create-post-schedule-btn__dot" aria-hidden="true" />
      ) : null}
    </button>
  );
}
