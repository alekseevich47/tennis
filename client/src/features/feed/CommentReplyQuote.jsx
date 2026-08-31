import React from 'react';
import Avatar from '../../components/ui/Avatar';
import PostContentHtml from './PostContentHtml';

/**
 * Цитата родительского комментария.
 * @param {{
 *   author?: import('../../lib/avatar').UserAvatarLike | null,
 *   text?: string,
 *   variant?: 'own' | 'other',
 *   inBubble?: boolean,
 *   onOpenProfile?: (user: any) => void,
 *   onActivate?: () => void,
 *   compact?: boolean
 * }} props
 */
function CommentReplyQuote({
  author,
  text,
  variant = 'other',
  inBubble = false,
  onOpenProfile,
  onActivate,
  compact = false
}) {
  const name = author?.full_name || 'Игрок секции';
  const interactive = typeof onActivate === 'function';

  return (
    <div
      className={[
        'comment-reply-quote',
        `comment-reply-quote--${variant}`,
        compact ? 'comment-reply-quote--compact' : '',
        inBubble ? 'comment-reply-quote--in-bubble' : '',
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
          {!inBubble ? (
            <Avatar user={author} size="sm" className="comment-reply-quote__avatar" />
          ) : null}
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
