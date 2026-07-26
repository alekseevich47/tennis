import React from 'react';

/**
 * Иконка ответа справа от лайка.
 * @param {{ onClick: () => void, disabled?: boolean }} props
 */
function CommentReplyButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="comment-reply-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label="Ответить на комментарий"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 17l-5-5 5-5" />
        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
      </svg>
    </button>
  );
}

export default CommentReplyButton;
