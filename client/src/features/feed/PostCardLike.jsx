import React from 'react';
import clsx from 'clsx';
import { usePostLikes } from '../../hooks/usePostLikes';

/**
 * Лайк публикации — лента и деталка.
 * @param {{ postId?: string | null, user?: { id?: string } | null }} props
 */
function PostCardLike({ postId, user }) {
  const { count, isLiked, toggle } = usePostLikes(postId);
  const userId = user?.id;
  const liked = isLiked(userId);

  const icon = (
    <>
      <span className="post-card-like__icon" aria-hidden="true">
        {liked ? '♥' : '♡'}
      </span>
      <span className="post-card-like__count">{count}</span>
    </>
  );

  if (!postId || !userId) {
    return (
      <div className="post-card-like post-card-like--readonly" aria-label={`Лайков: ${count}`}>
        {icon}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={clsx('post-card-like', liked && 'post-card-like--liked')}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        toggle(postId, userId);
      }}
      aria-pressed={liked}
      aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      {icon}
    </button>
  );
}

export default PostCardLike;
