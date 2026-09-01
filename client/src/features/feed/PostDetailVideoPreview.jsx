import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';

/**
 * Видео в деталке поста: без autoplay, poster + ▶; звук только в fullscreen.
 *
 * @param {{
 *   src: string,
 *   poster?: string,
 *   alt?: string,
 *   className?: string,
 *   width?: number | string,
 *   height?: number | string
 * }} props
 */
function PostDetailVideoPreview({
  src,
  poster,
  alt = 'Видео',
  className,
  width = 800,
  height = 600
}) {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const [loaded, setLoaded] = useState(false);
  const shouldLoad = Boolean(src);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // ignore seek before metadata
    }
  }, [src]);

  const showSkeleton = !poster && !loaded;

  return (
    <div
      className={clsx(
        'post-detail-video-preview',
        className,
        poster && 'post-detail-video-preview--has-poster',
        loaded && 'is-loaded'
      )}
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          className="post-detail-video-preview__poster"
          aria-hidden="true"
        />
      ) : null}
      {showSkeleton ? (
        <span className="post-media-skeleton post-detail-video-preview__skeleton" aria-hidden="true" />
      ) : null}
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={videoPreviewUrl(src)}
          poster={poster || undefined}
          className="post-detail-video-preview__video"
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

export default PostDetailVideoPreview;
