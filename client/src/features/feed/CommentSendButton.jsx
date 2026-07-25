import React from 'react';

/**
 * Кнопка отправки комментария — синяя пилюля со стрелкой вверх.
 * @param {{
 *   disabled?: boolean,
 *   busy?: boolean,
 *   className?: string
 * }} [props]
 */
export default function CommentSendButton({ disabled = false, busy = false, className }) {
  return (
    <button
      type="submit"
      className={className ? `comment-send-btn ${className}` : 'comment-send-btn'}
      disabled={disabled}
      aria-label={busy ? 'Отправляем…' : 'Отправить'}
      aria-busy={busy || undefined}
    >
      <svg
        className="comment-send-btn__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M12 4.5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L13 7.9V19a1 1 0 1 1-2 0V7.9L6.7 12.2a1 1 0 1 1-1.4-1.4l6-6a1 1 0 0 1 .7-.3z"
        />
      </svg>
    </button>
  );
}
