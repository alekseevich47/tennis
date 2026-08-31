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
 * play() откладываем до конца скролла — иначе webview рвёт жест обратного скролла.
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
  const timeRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const [loaded, setLoaded] = useState(false);
  const shouldPlay = inViewport && Boolean(src);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncRemaining = () => {
      const node = timeRef.current;
      if (!node) return;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const left = Math.max(0, duration - video.currentTime);
      node.textContent = formatRemainingTime(left);
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
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    if (!shouldPlay) {
      video.pause();
      return undefined;
    }

    let playTimer = 0;
    const tryPlay = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };

    // Не стартуем play во время активного скролла (MAX webview / Chromium).
    playTimer = window.setTimeout(tryPlay, 220);

    const onScrollEnd = () => {
      window.clearTimeout(playTimer);
      playTimer = window.setTimeout(tryPlay, 40);
    };
    const scrollRoot = video.closest('.ui-modal-body');
    scrollRoot?.addEventListener('scrollend', onScrollEnd);

    return () => {
      window.clearTimeout(playTimer);
      scrollRoot?.removeEventListener('scrollend', onScrollEnd);
    };
  }, [shouldPlay]);

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
      <span ref={timeRef} className="post-detail-video-preview__time" aria-hidden="true" />
    </div>
  );
}

export default PostDetailVideoPreview;
