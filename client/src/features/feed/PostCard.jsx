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
 *   onOpenDetail: (post: any) => void,
 *   onOpenEdit: (post: any) => void,
 *   onDelete: (postId: string) => void,
 *   onRestore: (postId: string) => void,
 *   onOpenFullscreen: (url: string) => void
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
  onOpenFullscreen
}) {
  const previewComments = useMemo(() => {
    const all = readComments(post).filter((c) => !c.is_deleted);
    return all.slice(-2);
  }, [post]);

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
    <article className="feed-card">
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
              onClick={() => onOpenEdit(post)}
            >
              <span aria-hidden="true">✎</span>
            </IconButton>
            <IconButton
              ariaLabel="Удалить публикацию"
              variant="ghost"
              size="sm"
              className="delete-post-btn"
              onClick={() => onDelete(post.id)}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          </div>
        )}
      </div>

      <div className="feed-card-body">
        <button
          type="button"
          className="post-text"
          onClick={() => onOpenDetail(post)}
        >
          {post.content || post.text}
        </button>
        <PostMedia post={post} onOpenFullscreen={onOpenFullscreen} />
      </div>

      <div className="feed-card-footer">
        <button
          type="button"
          className="comment-btn"
          onClick={() => onOpenDetail(post)}
        >
          <span aria-hidden="true">💬</span> Комментарии
        </button>
      </div>

      <CommentsPreview comments={previewComments} />
    </article>
  );
}

export default memo(PostCard);
