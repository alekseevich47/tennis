import React from 'react';
import clsx from 'clsx';

/**
 * Превью видео в карточке: только poster + ▶, без `<video>` (mp4 грузится в fullscreen).
 *
 * @param {{
 *   src?: string,
 *   poster?: string,
 *   active?: boolean,
 *   alt?: string,
 *   className?: string,
 *   width?: number | string,
 *   height?: number | string
 * }} props
 */
function FeedVideoPreview({
  poster,
  active = true,
  className,
  width = 800,
  height = 600
}) {
  const showSkeleton = !poster;

  return (
    <div
      className={clsx(
        'feed-video-preview',
        className,
        poster && 'feed-video-preview--has-poster',
        !active && 'feed-video-preview--inactive'
      )}
      style={{ width, height }}
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          className="feed-video-preview__poster"
          aria-hidden="true"
          loading="lazy"
        />
      ) : null}
      {showSkeleton ? (
        <span className="post-media-skeleton feed-video-preview__skeleton" aria-hidden="true" />
      ) : null}
      <span className="post-media-play-badge" aria-hidden="true">▶</span>
    </div>
  );
}

export default FeedVideoPreview;
