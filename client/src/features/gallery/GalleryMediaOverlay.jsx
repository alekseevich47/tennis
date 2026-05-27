import React from 'react';
import clsx from 'clsx';
import { useGalleryLikes } from '../../hooks/useGalleryLikes';

/**
 * @param {{
 *   mediaId: string | null,
 *   user: any,
 *   onCommentOpen: () => void,
 *   onDelete?: () => void,
 *   canDelete: boolean,
 *   bottomOffset?: number,
 *   hidden?: boolean
 * }} props
 */
function GalleryMediaOverlay({
  mediaId,
  user,
  onCommentOpen,
  onDelete,
  canDelete,
  bottomOffset = 0,
  hidden = false,
}) {
  const { count, isLiked, toggle, isLoading } = useGalleryLikes(mediaId);

  if (mediaId === null) return null;

  const liked = isLiked(user?.id);

  return (
    <div
      className={clsx('gallery-media-overlay', hidden === true && 'gallery-media-overlay--hidden')}
      style={{ bottom: `${bottomOffset}px` }}
    >
      <div className="gallery-media-overlay__inner">
        <button
          type="button"
          className={clsx('gallery-media-action', liked && 'gallery-media-action--liked')}
          onClick={() => toggle(mediaId, user?.id)}
          disabled={isLoading}
          aria-pressed={liked}
          aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
        >
          <span className="gallery-media-action__icon" aria-hidden="true">
            {liked ? '♥' : '♡'}
          </span>
          <span className="gallery-media-action__count">{count}</span>
        </button>

        {canDelete && (
          <button
            type="button"
            className="gallery-media-action gallery-media-action--delete"
            onClick={onDelete}
            disabled={!onDelete}
            aria-label="Удалить медиа"
          >
            <svg
              className="gallery-media-action__svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4 7h16" />
              <path d="M9 7V4h6v3" />
              <path d="m6 7 1 14h10l1-14" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="gallery-media-action"
          onClick={onCommentOpen}
          aria-label="Открыть комментарии"
        >
          <svg
            className="gallery-media-action__svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M7 18.5 3.75 21V5.5A2.5 2.5 0 0 1 6.25 3h11.5a2.5 2.5 0 0 1 2.5 2.5V16a2.5 2.5 0 0 1-2.5 2.5H7Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default GalleryMediaOverlay;
