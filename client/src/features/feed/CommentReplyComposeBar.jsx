import React from 'react';
import CommentReplyQuote from './CommentReplyQuote';

/**
 * Превью «отвечаем на…» над тулбаром форматирования.
 * @param {{
 *   comment: { expand?: { author?: any }, text?: string } | null,
 *   onCancel: () => void
 * }} props
 */
function CommentReplyComposeBar({ comment, onCancel }) {
  if (!comment) return null;

  return (
    <div className="comment-reply-compose">
      <CommentReplyQuote
        author={comment.expand?.author}
        text={comment.text}
        compact
      />
      <button
        type="button"
        className="comment-reply-compose__cancel"
        aria-label="Отменить ответ"
        onClick={onCancel}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default CommentReplyComposeBar;
