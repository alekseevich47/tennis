import React, { useEffect, useRef, useState } from 'react';
import { videoPreviewUrl } from '../../lib/media';

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
    setLoaded(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    if (!shouldLoad) {
      video.removeAttribute('src');
      video.load();
      return;
    }
    try {
      video.currentTime = 0;
    } catch {
      // ignore seek before metadata
    }
  }, [shouldLoad, src]);

  return (
    <div className={['feed-video-preview', loaded ? 'is-loaded' : ''].filter(Boolean).join(' ')}>
      {!loaded ? <span className="post-media-skeleton feed-video-preview__skeleton" aria-hidden="true" /> : null}
      {!shouldLoad && poster ? (
        <img src={poster} alt="" className={className} aria-hidden="true" />
      ) : null}
      {shouldLoad ? (
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
      ) : null}
      <span className="post-media-play-badge" aria-hidden="true">▶</span>
    </div>
  );
}

export default FeedVideoPreview;
