import React, { useEffect, useRef, useState } from 'react';
import { videoPreviewUrl } from '../../lib/media';

/**
 * @param {number} seconds
 */
function formatRemainingTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Видео в карточке ленты: без autoplay, значок ▶ по центру, скелетон до загрузки.
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
    const video = videoRef.current;
    if (!video) return;
    if (!shouldLoad) {
      video.pause();
      setLoaded(false);
      return;
    }
    try {
      video.currentTime = 0;
    } catch {
      // ignore seek before metadata
    }
  }, [shouldLoad, src]);

  if (!shouldLoad) {
    return (
      <div className="feed-video-preview">
        {poster ? (
          <img src={poster} alt="" className={className} aria-hidden="true" />
        ) : (
          <span className="post-media-skeleton feed-video-preview__skeleton" aria-hidden="true" />
        )}
        <span className="post-media-play-badge" aria-hidden="true">▶</span>
      </div>
    );
  }

  return (
    <div className={['feed-video-preview', loaded ? 'is-loaded' : ''].filter(Boolean).join(' ')}>
      {!loaded ? <span className="post-media-skeleton feed-video-preview__skeleton" aria-hidden="true" /> : null}
      <video
        ref={videoRef}
        src={videoPreviewUrl(src)}
        className={className}
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
      <span className="post-media-play-badge" aria-hidden="true">▶</span>
    </div>
  );
}

export default FeedVideoPreview;
