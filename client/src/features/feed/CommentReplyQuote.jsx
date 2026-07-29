import React from 'react';
import Avatar from '../../components/ui/Avatar';
import PostContentHtml from './PostContentHtml';

/**
 * Цитата родительского комментария (синяя полоска + аватар + имя + текст).
 * Текст всегда clamp 2 строки. Клик по цитате (не по автору) → onActivate.
 * @param {{
 *   author?: import('../../lib/avatar').UserAvatarLike | null,
 *   text?: string,
 *   onOpenProfile?: (user: any) => void,
 *   onActivate?: () => void,
 *   compact?: boolean
 * }} props
 */
function CommentReplyQuote({ author, text, onOpenProfile, onActivate, compact = false }) {
  const name = author?.full_name || 'Игрок секции';
  const interactive = typeof onActivate === 'function';

  return (
    <div
      className={[
        'comment-reply-quote',
        compact ? 'comment-reply-quote--compact' : '',
        interactive ? 'comment-reply-quote--interactive' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onActivate();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onActivate();
              }
            }
          : undefined
      }
    >
      <span className="comment-reply-quote__accent" aria-hidden="true" />
      <div className="comment-reply-quote__body">
        <button
          type="button"
          className="comment-reply-quote__author"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile?.(author);
          }}
          aria-label={`Открыть профиль ${name}`}
        >
          <Avatar user={author} size="sm" className="comment-reply-quote__avatar" />
          <span className="comment-reply-quote__name">{name}</span>
        </button>
        {text ? (
          <PostContentHtml as="p" className="comment-reply-quote__text" content={text} />
        ) : null}
      </div>
    </div>
  );
}

export default CommentReplyQuote;
