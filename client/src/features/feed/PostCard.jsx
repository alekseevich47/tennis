import React, { memo, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import PostMedia from './PostMedia';
import PostContentHtml from './PostContentHtml';
import CommentsPreview from './CommentsPreview';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
import { usePostLikes } from '../../hooks/usePostLikes';
import { usePostViewTracker } from '../../hooks/usePostViewTracker';
import { formatPostDate } from '../../lib/format';
import { LongPressRing, useLongPress } from '../../lib/longPress';

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

/**
 * @param {{
 *   post: import('../../services/posts').PostRecord,
 *   user?: any,
 *   isSoftDeleted: boolean,
 *   userIsModerator: boolean,
 *   onOpenDetail: (post: any, focusComment?: boolean) => void,
 *   onRestore: (postId: string) => void,
 *   onLongPress?: (post: any, point: { x: number, y: number }) => void,
 *   cardRef?: (el: HTMLElement | null) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen: (items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void,
 *   scrollRootRef?: React.RefObject<HTMLElement | null>
 * }} props
 */
function PostCard({
  post,
  user,
  isSoftDeleted,
  userIsModerator,
  onOpenDetail,
  onRestore,
  onLongPress,
  cardRef,
  hiddenMediaKey,
  onOpenFullscreen,
  scrollRootRef
}) {
  const comments = useMemo(() => {
    return readComments(post).filter((c) => !c.is_deleted);
  }, [post]);
  const previewComments = comments.slice(-2);
  const commentCount = comments.length;

  const trackViews = Boolean(user?.id) && !isSoftDeleted && post?.is_deleted !== true;
  const viewRef = usePostViewTracker({
    objectType: 'post',
    objectId: post?.id,
    enabled: trackViews,
    scrollRootRef
  });

  const handleLongPress = useCallback(
    (point) => {
      onLongPress?.(post, point);
    },
    [onLongPress, post]
  );

  const { handlers: longPressHandlers, cardStyle, ringProps } = useLongPress({
    enabled: userIsModerator && !isSoftDeleted,
    onLongPress: handleLongPress
  });

  const handleOpenDetail = () => {
    onOpenDetail(post);
  };

  const handleCardClick = (event) => {
    // Лайк/комменты/интерактив внутри карточки — не открывать деталку
    // (иначе setPointerCapture long-press на article перехватывает click).
    if (
      event.target instanceof Element &&
      event.target.closest(
        'button, a, input, textarea, [role="button"], .post-card-like, .post-card-comment-btn, .comments-preview-trigger, .telegram-post-media-grid'
      )
    ) {
      return;
    }
    longPressHandlers.onClick(event);
    if (event.defaultPrevented) return;
    handleOpenDetail();
  };

  const handlePostTextClick = (event) => {
    // Клик по гиперссылке — открыть URL, не деталку.
    if (event.target instanceof Element && event.target.closest('a[href]')) {
      event.stopPropagation();
      return;
    }
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
    <>
      <article
        ref={cardRef}
        className="feed-card"
        onClick={handleCardClick}
        onPointerDown={longPressHandlers.onPointerDown}
        onPointerMove={longPressHandlers.onPointerMove}
        onPointerUp={longPressHandlers.onPointerUp}
        onPointerCancel={longPressHandlers.onPointerCancel}
        onPointerLeave={longPressHandlers.onPointerLeave}
        onContextMenu={longPressHandlers.onContextMenu}
        style={{ cursor: 'pointer', ...cardStyle }}
      >
        <div ref={viewRef} className="post-view-sentinel" aria-hidden="true" />
        <div className="feed-card-header">
          <div className="section-avatar" aria-hidden="true">
            <img className="section-avatar__image" src={sectionAvatarUrl} alt="" decoding="async" />
          </div>
          <div className="section-meta">
            <span className="section-title-name">Секция Миленьких</span>
            <span className="post-date-line">
              <span className="post-date">{formatPostDate(post.created)}</span>
              {post.post_number ? <span className="post-number">#{post.post_number}</span> : null}
              {post.is_pinned ? (
                <svg
                  className="post-pin-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Закреплено"
                  role="img"
                >
                  <path d="M16 3H8v2h1v5.2L7 14v2h4.2V21h1.6v-5H17v-2l-2-3.8V5h1V3z" />
                </svg>
              ) : null}
            </span>
          </div>
        </div>

        <div className="feed-card-body">
          {post.caption_above !== false ? (
            <PostContentHtml
              as="div"
              role="button"
              tabIndex={0}
              className="post-text"
              onClick={handlePostTextClick}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                if (event.target instanceof Element && event.target.closest('a[href]')) return;
                event.preventDefault();
                onOpenDetail(post);
              }}
              content={post.content || post.text}
            />
          ) : null}
          <PostMedia
            post={post}
            hiddenMediaKey={hiddenMediaKey}
            onOpenFullscreen={onOpenFullscreen}
            scrollRootRef={scrollRootRef}
          />
          {post.caption_above === false ? (
            <PostContentHtml
              as="div"
              role="button"
              tabIndex={0}
              className="post-text"
              onClick={handlePostTextClick}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                if (event.target instanceof Element && event.target.closest('a[href]')) return;
                event.preventDefault();
                onOpenDetail(post);
              }}
              content={post.content || post.text}
            />
          ) : null}
        </div>

        <div className="feed-card-footer feed-card-bottom-bar">
          <PostCardLike postId={post.id} user={user} />
          <button
            type="button"
            className="post-card-comment-btn"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleOpenComments}
            aria-label={`Открыть комментарии к публикации. Комментариев: ${commentCount}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12Z" />
            </svg>
            <span className="post-card-comment-btn__count">{commentCount}</span>
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

      <LongPressRing {...ringProps} />
    </>
  );
}

export default memo(PostCard);
