import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import '@videojs/react/video/skin.css';
import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video';

const SECONDARY_GROUP = '.media-controls--secondary .media-button-group';

/**
 * Иконка ✕ в стиле media-icon (18×18, currentColor).
 * @param {React.SVGProps<SVGSVGElement>} props
 */
function CloseIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      fill="currentColor"
      aria-hidden="true"
      viewBox="0 0 18 18"
      {...props}
    >
      <path d="M4.04 4.04a.9.9 0 0 1 1.27 0L9 7.73l3.69-3.69a.9.9 0 1 1 1.27 1.27L10.27 9l3.69 3.69a.9.9 0 1 1-1.27 1.27L9 10.27l-3.69 3.69a.9.9 0 1 1-1.27-1.27L7.73 9 4.04 5.31a.9.9 0 0 1 0-1.27z" />
    </svg>
  );
}

/**
 * Крестик в верхнем (secondary) трее Default skin — portal в `.media-button-group`.
 * Скрывается/показывается вместе с тулбаром плеера.
 *
 * @param {{ onClose: () => void, rootRef: React.RefObject<HTMLElement | null> }} props
 */
function PlayerCloseButton({ onClose, rootRef }) {
  const [host, setHost] = useState(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const attach = () => {
      const el = root.querySelector(SECONDARY_GROUP);
      if (el) setHost(el);
      return Boolean(el);
    };

    if (attach()) return undefined;

    const mo = new MutationObserver(() => {
      if (attach()) mo.disconnect();
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [rootRef]);

  if (!host) return null;

  return createPortal(
    <button
      type="button"
      className="media-button media-button--subtle media-button--icon fullscreen-vjs-close"
      aria-label="Закрыть просмотр"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <CloseIcon className="media-icon" />
    </button>,
    host
  );
}

/**
 * Video.js v10 Default (React) + close в secondary tray.
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
  const shellRef = useRef(null);

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
    <div ref={shellRef} className={clsx('fullscreen-vjs-shell', className)} style={style}>
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
        <PlayerCloseButton onClose={onClose} rootRef={shellRef} />
      </VideoPlayer>
    </div>
  );
}

export default FullscreenVjsPlayer;
