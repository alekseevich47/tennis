import React, { useCallback } from 'react';
import clsx from 'clsx';
import '@videojs/react/video/skin.css';
import { selectControls } from '@videojs/react';
import { Video, VideoPlayer, VideoSkin, usePlayer } from '@videojs/react/video';

/**
 * Крестик в верхнем трее Default skin (рядом с secondary controls).
 * Видимость синхронизирована с `controlsVisible`.
 *
 * @param {{ onClose: () => void }} props
 */
function PlayerCloseButton({ onClose }) {
  const controls = usePlayer(selectControls);
  const visible = Boolean(controls?.controlsVisible ?? controls?.visible);

  return (
    <button
      type="button"
      className="fullscreen-vjs-close"
      aria-label="Закрыть просмотр"
      data-visible={visible ? '' : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}

/**
 * Video.js v10 Default (React) + close в верхнем трее.
 *
 * @param {{
 *   src: string,
 *   poster?: string,
 *   className?: string,
 *   style?: React.CSSProperties,
 *   ariaLabel?: string,
 *   videoRef?: (el: HTMLVideoElement | null) => void,
 *   onClose: () => void
 * }} props
 */
function FullscreenVjsPlayer({
  src,
  poster = '',
  className,
  style,
  ariaLabel,
  videoRef,
  onClose
}) {
  const attachRef = useCallback(
    (el) => {
      videoRef?.(el);
      if (!el) return;
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
        <PlayerCloseButton onClose={onClose} />
      </VideoPlayer>
    </div>
  );
}

export default FullscreenVjsPlayer;
