import React from 'react';
import clsx from 'clsx';

/**
 * Видео в деталке поста: poster + ▶; воспроизведение только в fullscreen.
 *
 * @param {{
 *   src?: string,
 *   poster?: string,
 *   alt?: string,
 *   className?: string,
 *   width?: number | string,
 *   height?: number | string
 * }} props
 */
function PostDetailVideoPreview({
  poster,
  className,
  width = 800,
  height = 600
}) {
  const showSkeleton = !poster;

  return (
    <div
      className={clsx(
        'post-detail-video-preview',
        className,
        poster && 'post-detail-video-preview--has-poster'
      )}
      style={{ width, height }}
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          className="post-detail-video-preview__poster"
          aria-hidden="true"
          loading="lazy"
        />
      ) : null}
      {showSkeleton ? (
        <span className="post-media-skeleton post-detail-video-preview__skeleton" aria-hidden="true" />
      ) : null}
      <span className="post-media-play-badge" aria-hidden="true">▶</span>
    </div>
  );
}

export default PostDetailVideoPreview;
