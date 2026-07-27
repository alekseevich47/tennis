import React, { useCallback, useRef, useState } from 'react';
import CommentReplyQuote from './CommentReplyQuote';
import { SWIPE_CLOSE_THRESHOLD } from '../../lib/gestures';

const EXIT_MS = 220;
const DRAG_DEADZONE = 8;

/**
 * Превью «отвечаем на…» над тулбаром форматирования.
 * Свайп влево/вправо — плавное смахивание и отмена ответа.
 * @param {{
 *   comment: { expand?: { author?: any }, text?: string } | null,
 *   onCancel: () => void
 * }} props
 */
function CommentReplyComposeBar({ comment, onCancel }) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const gestureRef = useRef(/** @type {null | {
    startX: number,
    startY: number,
    deltaX: number,
    isVertical: boolean,
    active: boolean
  }} */ (null));
  const dismissedRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);

  const applyTransform = useCallback((x, opacity, withTransition) => {
    const el = rootRef.current;
    if (!el) return;
    el.style.transition = withTransition
      ? `transform ${EXIT_MS}ms ease, opacity ${EXIT_MS}ms ease`
      : 'none';
    el.style.transform = `translate3d(${x}px,0,0)`;
    el.style.opacity = String(opacity);
  }, []);

  const finishCancel = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onCancel();
  }, [onCancel]);

  const dismissWithSwipe = useCallback(
    (direction) => {
      if (dismissedRef.current) return;
      setExiting(true);
      setDragging(false);
      const width = rootRef.current?.offsetWidth || window.innerWidth;
      applyTransform(direction * (width + 32), 0, true);
      window.setTimeout(finishCancel, EXIT_MS);
    },
    [applyTransform, finishCancel]
  );

  const handleCancelClick = () => {
    if (dismissedRef.current || exiting) return;
    finishCancel();
  };

  const handleTouchStart = (event) => {
    if (exiting) return;
    const touch = event.touches[0];
    if (!touch) return;
    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      isVertical: false,
      active: false
    };
  };

  const handleTouchMove = (event) => {
    const gesture = gestureRef.current;
    const touch = event.touches[0];
    if (!gesture || !touch || exiting) return;

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    gesture.deltaX = deltaX;

    if (!gesture.active) {
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        gesture.isVertical = true;
        return;
      }
      if (Math.abs(deltaX) < DRAG_DEADZONE) return;
      gesture.active = true;
      setDragging(true);
    }

    if (gesture.isVertical) return;

    const opacity = Math.max(0.35, 1 - Math.abs(deltaX) / (SWIPE_CLOSE_THRESHOLD * 1.5));
    applyTransform(deltaX, opacity, false);
  };

  const handleTouchEnd = () => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || exiting) return;

    if (gesture.isVertical || !gesture.active) {
      setDragging(false);
      return;
    }

    const { deltaX } = gesture;
    if (Math.abs(deltaX) >= SWIPE_CLOSE_THRESHOLD) {
      dismissWithSwipe(deltaX > 0 ? 1 : -1);
      return;
    }

    setDragging(false);
    applyTransform(0, 1, true);
  };

  if (!comment) return null;

  const className = [
    'comment-reply-compose',
    dragging ? 'comment-reply-compose--dragging' : '',
    exiting ? 'comment-reply-compose--exiting' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <CommentReplyQuote
        author={comment.expand?.author}
        text={comment.text}
        compact
      />
      <button
        type="button"
        className="comment-reply-compose__cancel"
        aria-label="Отменить ответ"
        onClick={handleCancelClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default CommentReplyComposeBar;
