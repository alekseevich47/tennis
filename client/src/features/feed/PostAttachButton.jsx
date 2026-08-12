import React from 'react';

/** Контурная скрепка (как в UI-референсе). */
function PaperclipIcon() {
  return (
    <svg className="create-post-attach-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16.5 6.5v9.2a4.5 4.5 0 0 1-9 0V7.8a3.2 3.2 0 0 1 6.4 0v7.4a1.9 1.9 0 1 1-3.8 0V8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Квадратная кнопка «Добавить медиа» (слева от Опубликовать/Сохранить).
 *
 * @param {{
 *   disabled?: boolean,
 *   onClick: () => void,
 *   className?: string
 * }} props
 */
function PostAttachButton({ disabled = false, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`create-post-attach-btn${className ? ` ${className}` : ''}`}
      disabled={disabled}
      aria-label="Добавить медиа"
      onClick={onClick}
    >
      <PaperclipIcon />
    </button>
  );
}

export default PostAttachButton;
