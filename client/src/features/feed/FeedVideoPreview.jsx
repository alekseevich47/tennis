import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';

/**
 * Видео в карточке ленты: без autoplay, значок ▶ по центру, poster до загрузки кадра.
 *
 * @param {{
 *   src: string,
 *   poster?: string,
 *   active?: boolean,
 *   alt?: string,
 *   className?: string,
 *   width?: number | string,
 *   height?: number | string
 * }} props
 */
function FeedVideoPreview({
  src,
  poster,
  active = true,
  alt = 'Видео',
  className,
  width = 800,
  height = 600
}) {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const [loaded, setLoaded] = useState(false);
  const shouldLoad = active && Boolean(src);

  useEffect(() => {
    setLoaded(false);
  }, [src, shouldLoad]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // ignore seek before metadata
    }
  }, [shouldLoad, src]);

  const showSkeleton = !poster && !loaded;

  return (
    <div
      className={clsx(
        'feed-video-preview',
        className,
        poster && 'feed-video-preview--has-poster',
        loaded && shouldLoad && 'is-loaded',
        !shouldLoad && 'feed-video-preview--inactive'
      )}
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          className="feed-video-preview__poster"
          aria-hidden="true"
        />
      ) : null}
      {showSkeleton ? (
        <span className="post-media-skeleton feed-video-preview__skeleton" aria-hidden="true" />
      ) : null}
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={videoPreviewUrl(src)}
          poster={poster || undefined}
          className="feed-video-preview__video"
          preload="metadata"
          playsInline
          muted
          disablePictureInPicture
          aria-label={alt}
          width={width}
          height={height}
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
        />
      ) : null}
      <span className="post-media-play-badge" aria-hidden="true">▶</span>
    </div>
  );
}

export default FeedVideoPreview;
