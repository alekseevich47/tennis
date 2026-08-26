import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import gsap from 'gsap';

/**
 * Кнопка отправки комментария: стрелка вверх → вправо → самолётик улетает.
 * @param {{
 *   disabled?: boolean,
 *   busy?: boolean,
 *   phase?: 'idle' | 'armed' | 'flying',
 *   badgeCount?: number,
 *   className?: string,
 *   onPointerDown?: (e: React.PointerEvent) => void,
 *   onPointerMove?: (e: React.PointerEvent) => void,
 *   onPointerUp?: (e: React.PointerEvent) => void,
 *   onPointerCancel?: (e: React.PointerEvent) => void,
 *   onPointerLeave?: (e: React.PointerEvent) => void,
 *   onContextMenu?: (e: React.MouseEvent) => void,
 *   onClick?: (e: React.MouseEvent) => void
 * }} [props]
 */
export default function CommentSendButton({
  disabled = false,
  busy = false,
  phase = 'idle',
  badgeCount = 0,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onContextMenu,
  onClick
}) {
  const rootRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const arrowRef = useRef(/** @type {SVGSVGElement | null} */ (null));
  const planeRef = useRef(/** @type {SVGSVGElement | null} */ (null));
  const prevPhase = useRef(phase);

  useEffect(() => {
    const arrow = arrowRef.current;
    const plane = planeRef.current;
    if (!arrow || !plane) return;

    if (phase === 'flying' && prevPhase.current !== 'flying') {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(plane, { clearProps: 'all', opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.6 });
          gsap.set(arrow, { opacity: 1, rotate: 0 });
        }
      });
      gsap.set(plane, { opacity: 1, scale: 0.85, rotate: 28, x: 0, y: 0 });
      gsap.set(arrow, { opacity: 0 });
      tl.to(plane, {
        x: 72,
        y: -18,
        rotate: 38,
        scale: 0.55,
        opacity: 0,
        duration: 0.38,
        ease: 'power2.in'
      }, 0);
      tl.set(arrow, { opacity: 1, rotate: 0 }, 0.12);
    } else if (phase !== 'flying') {
      gsap.to(arrow, {
        rotate: phase === 'armed' ? 90 : 0,
        duration: 0.28,
        ease: 'power2.out',
        overwrite: true
      });
      gsap.set(plane, { opacity: 0, x: 0, y: 0, scale: 0.6, rotate: 0 });
    }

    prevPhase.current = phase;
  }, [phase]);

  return (
    <button
      ref={rootRef}
      type="submit"
      className={clsx(
        'comment-send-btn',
        phase === 'armed' && 'comment-send-btn--armed',
        phase === 'flying' && 'comment-send-btn--flying',
        className
      )}
      disabled={disabled}
      aria-label={busy ? 'Отправляем…' : 'Отправить'}
      aria-busy={busy || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      {badgeCount > 0 ? (
        <span className="comment-send-btn__badge" aria-hidden="true">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
      <svg
        ref={arrowRef}
        className="comment-send-btn__icon comment-send-btn__icon--arrow"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M12 4.5a1 1 0 0 1 .7.3l6 6a1 1 0 1 1-1.4 1.4L13 7.9V19a1 1 0 1 1-2 0V7.9L6.7 12.2a1 1 0 1 1-1.4-1.4l6-6a1 1 0 0 1 .7-.3z"
        />
      </svg>
      <svg
        ref={planeRef}
        className="comment-send-btn__icon comment-send-btn__icon--plane"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M3.2 11.05 20.4 3.7a1 1 0 0 1 1.35 1.18L15.9 20.7a1 1 0 0 1-1.82.18l-3.2-6.05-6.2-1.55a1 1 0 0 1-.48-1.63Zm3.6.45 4.55 1.14 2.35 4.45 4.15-12.35-11.05 6.76Z"
        />
      </svg>
    </button>
  );
}
