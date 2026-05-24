import React, { memo, useMemo } from 'react';
import IconButton from '../../components/ui/IconButton';
import PostMedia from './PostMedia';
import CommentsPreview from './CommentsPreview';
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

/**
 * @param {{
 *   post: import('../../services/posts').PostRecord,
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
        <div className="section-avatar" aria-hidden="true">🎾</div>
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
              <span aria-hidden="true">✎</span>
            </IconButton>
            <IconButton
              ariaLabel="Удалить публикацию"
              variant="danger"
              size="sm"
              className="delete-post-btn"
              onClick={handleDelete}
            >
              <span aria-hidden="true">🗑</span>
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

      <div className="feed-card-footer">
        <button
          type="button"
          className="comment-btn"
          onClick={handleOpenComments}
        >
          <span aria-hidden="true">💬</span> Комментарии
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
