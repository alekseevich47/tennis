import React from 'react';
import Avatar from '../../components/ui/Avatar';
import PostContentHtml from './PostContentHtml';

/**
 * Цитата родительского комментария (синяя полоска + аватар + имя + текст).
 * @param {{
 *   author?: import('../../lib/avatar').UserAvatarLike | null,
 *   text?: string,
 *   onOpenProfile?: (user: any) => void,
 *   compact?: boolean
 * }} props
 */
function CommentReplyQuote({ author, text, onOpenProfile, compact = false }) {
  const name = author?.full_name || 'Игрок секции';

  return (
    <div className={compact ? 'comment-reply-quote comment-reply-quote--compact' : 'comment-reply-quote'}>
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
