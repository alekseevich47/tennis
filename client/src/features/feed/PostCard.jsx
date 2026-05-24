import React, { memo, useMemo } from 'react';
import clsx from 'clsx';
import IconButton from '../../components/ui/IconButton';
import PostMedia from './PostMedia';
import CommentsPreview from './CommentsPreview';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
import { usePostLikes } from '../../hooks/usePostLikes';
import { formatPostDate } from '../../lib/format';

/**
 * Безопасное извлечение комментариев из expand.
 * @param {any} post
 */
function readComments(post) {
  if (!post || !post.expand) return [];
  const list = post.expand['comments(post)'];
  if (!list) return [];
  return Array.isArray(list) ? list : [list];
}

function PostCardLike({ postId, user }) {
  const { count, isLiked, toggle, isLoading } = usePostLikes(postId);
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

  if (!userId) {
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
      onClick={(event) => {
        event.stopPropagation();
        toggle(postId, userId);
      }}
      disabled={isLoading}
      aria-pressed={liked}
      aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      {icon}
    </button>
  );
}

/**
 * @param {{
 *   post: import('../../services/posts').PostRecord,
 *   user?: any,
 *   isSoftDeleted: boolean,
 *   userIsModerator: boolean,
 *   onOpenDetail: (post: any, focusComment?: boolean) => void,
 *   onOpenEdit: (post: any) => void,
 *   onDelete: (postId: string) => void,
 *   onRestore: (postId: string) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen: (items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function PostCard({
  post,
  user,
  isSoftDeleted,
  userIsModerator,
  onOpenDetail,
  onOpenEdit,
  onDelete,
  onRestore,
  hiddenMediaKey,
  onOpenFullscreen
}) {
  const previewComments = useMemo(() => {
    const all = readComments(post).filter((c) => !c.is_deleted);
    return all.slice(-2);
  }, [post]);

  const handleOpenDetail = () => {
    onOpenDetail(post);
  };

  const handlePostTextClick = (event) => {
    event.stopPropagation();
    onOpenDetail(post);
  };

  const handleOpenComments = (event) => {
    event.stopPropagation();
    onOpenDetail(post, true);
  };

  const handleCommentsPreviewKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleOpenComments(event);
  };

  const handleOpenEdit = (event) => {
    event.stopPropagation();
    onOpenEdit(post);
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete(post.id);
  };

  if (isSoftDeleted && userIsModerator) {
    return (
      <div className="feed-card soft-deleted-card">
        <div className="soft-deleted-text-group">
          <p className="soft-deleted-title">Вы удалили публикацию.</p>
          <p className="soft-deleted-subtitle">Но пока всё ещё можете её восстановить</p>
        </div>
        <button
          type="button"
          className="restore-post-btn"
          onClick={() => onRestore(post.id)}
        >
          Восстановить
        </button>
      </div>
    );
  }

  return (
    <article
      className="feed-card"
      onClick={handleOpenDetail}
      style={{ cursor: 'pointer' }}
    >
      <div className="feed-card-header">
        <div className="section-avatar" aria-hidden="true">
          <img className="section-avatar__image" src={sectionAvatarUrl} alt="" decoding="async" />
        </div>
        <div className="section-meta">
          <span className="section-title-name">Секция Миленьких</span>
          <span className="post-date">{formatPostDate(post.created)}</span>
        </div>
        {userIsModerator && (
          <div className="post-card-actions" role="group" aria-label="Действия с публикацией">
            <IconButton
              ariaLabel="Редактировать публикацию"
              variant="ghost"
              size="sm"
              className="edit-post-btn"
              onClick={handleOpenEdit}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
                <path d="m13.7 6.1 4.2 4.2" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel="Удалить публикацию"
              variant="danger"
              size="sm"
              className="delete-post-btn"
              onClick={handleDelete}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 7h16" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M6 7l1 13h10l1-13" />
                <path d="M9 7V4h6v3" />
              </svg>
            </IconButton>
          </div>
        )}
      </div>

      <div className="feed-card-body">
        <button
          type="button"
          className="post-text"
          onClick={handlePostTextClick}
        >
          {post.content || post.text}
        </button>
        <PostMedia
          post={post}
          hiddenMediaKey={hiddenMediaKey}
          onOpenFullscreen={onOpenFullscreen}
        />
      </div>

      <div className="feed-card-footer feed-card-bottom-bar">
        <PostCardLike postId={post.id} user={user} />
        <button
          type="button"
          className="post-card-comment-btn"
          onClick={handleOpenComments}
          aria-label="Открыть комментарии к публикации"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12Z" />
          </svg>
        </button>
      </div>

      {previewComments.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          className="comments-preview-trigger"
          onClick={handleOpenComments}
          onKeyDown={handleCommentsPreviewKeyDown}
          aria-label="Открыть комментарии к публикации"
        >
          <CommentsPreview comments={previewComments} />
        </div>
      )}
    </article>
  );
}

export default memo(PostCard);
