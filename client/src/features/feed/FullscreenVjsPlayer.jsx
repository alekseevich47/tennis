import React, { useCallback } from 'react';
import clsx from 'clsx';
import '@videojs/react/video/skin.css';
import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video';

/**
 * Video.js v10 Default (React) — без кастомной логики плеера.
 *
 * @param {{
 *   src: string,
 *   poster?: string,
 *   className?: string,
 *   style?: React.CSSProperties,
 *   ariaLabel?: string,
 *   videoRef?: (el: HTMLVideoElement | null) => void
 * }} props
 */
function FullscreenVjsPlayer({
  src,
  poster = '',
  className,
  style,
  ariaLabel,
  videoRef
}) {
  const attachRef = useCallback(
    (el) => {
      videoRef?.(el);
      if (!el) return;
      // Открытие fullscreen — user gesture → можно со звуком.
      el.muted = false;
      void el.play().catch(() => {});
    },
    [videoRef]
  );

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
          />
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
}

export default FullscreenVjsPlayer;
