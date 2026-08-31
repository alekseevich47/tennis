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
 * Видео в деталке поста: muted autoplay в viewport, остаток времени, пауза вне зоны.
 *
 * @param {{
 *   src: string,
 *   alt?: string,
 *   className?: string,
 *   inViewport?: boolean,
 *   width?: number | string,
 *   height?: number | string
 * }} props
 */
function PostDetailVideoPreview({
  src,
  alt = 'Видео',
  className,
  inViewport = true,
  width = 800,
  height = 600
}) {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const [loaded, setLoaded] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setRemaining(0);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncRemaining = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const left = Math.max(0, duration - video.currentTime);
      setRemaining(left);
    };

    video.addEventListener('loadedmetadata', syncRemaining);
    video.addEventListener('durationchange', syncRemaining);
    video.addEventListener('timeupdate', syncRemaining);
    syncRemaining();

    return () => {
      video.removeEventListener('loadedmetadata', syncRemaining);
      video.removeEventListener('durationchange', syncRemaining);
      video.removeEventListener('timeupdate', syncRemaining);
    };
  }, [src, loaded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (inViewport) {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [inViewport, src]);

  return (
    <div className={['post-detail-video-preview', loaded ? 'is-loaded' : ''].filter(Boolean).join(' ')}>
      {!loaded ? <span className="post-media-skeleton post-detail-video-preview__skeleton" aria-hidden="true" /> : null}
      <video
        ref={videoRef}
        src={videoPreviewUrl(src)}
        className={className}
        preload="metadata"
        playsInline
        muted
        loop
        disablePictureInPicture
        aria-label={alt}
        width={width}
        height={height}
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => setLoaded(true)}
      />
      {loaded && remaining > 0 ? (
        <span className="post-detail-video-preview__time" aria-hidden="true">
          {formatRemainingTime(remaining)}
        </span>
      ) : null}
    </div>
  );
}

export default PostDetailVideoPreview;
