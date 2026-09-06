import React, { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import '@videojs/react/video/skin.css';
import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video';

/**
 * Video.js v10 Default skin (React) для fullscreen.
 * `videoRef` — HTMLVideoElement (нативный media API + mediaRef / gallery overlay).
 *
 * @param {{
 *   src: string,
 *   poster?: string,
 *   className?: string,
 *   style?: React.CSSProperties,
 *   ariaLabel?: string,
 *   videoRef?: (el: HTMLVideoElement | null) => void,
 *   onCanPlay?: (event: React.SyntheticEvent<HTMLVideoElement>) => void,
 *   onWaiting?: (event: React.SyntheticEvent<HTMLVideoElement>) => void,
 *   onPlaying?: (event: React.SyntheticEvent<HTMLVideoElement>) => void,
 *   onTimeUpdate?: (event: React.SyntheticEvent<HTMLVideoElement>) => void,
 *   onPlay?: (event: React.SyntheticEvent<HTMLVideoElement>) => void,
 *   onPause?: (event: React.SyntheticEvent<HTMLVideoElement>) => void
 * }} props
 */
function FullscreenVjsPlayer({
  src,
  poster = '',
  className,
  style,
  ariaLabel,
  videoRef,
  onCanPlay,
  onWaiting,
  onPlaying,
  onTimeUpdate,
  onPlay,
  onPause
}) {
  const mediaElRef = useRef(/** @type {HTMLVideoElement | null} */ (null));

  const attachRef = useCallback(
    (el) => {
      mediaElRef.current = el;
      videoRef?.(el);
      if (el) {
        el.muted = false;
        void el.play().catch(() => {});
      }
    },
    [videoRef]
  );

  useEffect(() => {
    const el = mediaElRef.current;
    if (!el || !src) return;
    el.muted = false;
    void el.play().catch(() => {});
  }, [src]);

  return (
    <div className={clsx('fullscreen-vjs-shell', className)} style={style}>
      <VideoPlayer poster={poster || undefined} className="fullscreen-vjs-player">
        <VideoSkin className="fullscreen-vjs-skin">
          <Video
            ref={attachRef}
            src={src}
            playsInline
            preload="auto"
            className="fullscreen-vjs-media"
            aria-label={ariaLabel}
            onCanPlay={onCanPlay}
            onWaiting={onWaiting}
            onPlaying={onPlaying}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
          />
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
}

export default FullscreenVjsPlayer;
