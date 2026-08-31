import React, { useEffect, useRef, useState } from 'react';
import { videoPreviewUrl } from '../../lib/media';

/**
 * Видео в ленте: muted autoplay при попадании в viewport, loop, без controls.
 *
 * @param {{
 *   src: string,
 *   alt?: string,
 *   className?: string,
 *   inViewport?: boolean,
 *   showPlayBadge?: boolean,
 *   width?: number | string,
 *   height?: number | string
 * }} props
 */
function FeedVideoPreview({
  src,
  alt = 'Видео',
  className,
  inViewport = false,
  showPlayBadge = false,
  width = 800,
  height = 600
}) {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const [playing, setPlaying] = useState(false);

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
      try {
        video.currentTime = 0;
      } catch {
        // ignore seek errors while metadata is loading
      }
      setPlaying(false);
    }
  }, [inViewport, src]);

  return (
    <>
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {showPlayBadge && !playing && (
        <span className="post-media-play-badge" aria-hidden="true">▶</span>
      )}
    </>
  );
}

export default FeedVideoPreview;
