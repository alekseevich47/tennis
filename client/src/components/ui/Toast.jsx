import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SWIPE_CLOSE_THRESHOLD } from '../../lib/gestures';
import './Toast.css';

function Toast({ text, actionLabel, onAction, autoDismissMs = 3000, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const touchGestureRef = useRef(null);
  const dismissedRef = useRef(false);
  const hasAction = Boolean(actionLabel);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsExiting(true);
    window.setTimeout(() => onDismiss?.(), 180);
  }, [onDismiss]);

  useEffect(() => {
    if (hasAction || autoDismissMs <= 0) return undefined;
    const timer = window.setTimeout(dismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, dismiss, hasAction]);

  const handleActionClick = (event) => {
    event.stopPropagation();
    onAction?.();
    dismiss();
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchGestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      isVerticalScroll: false
    };
  };

  const handleTouchMove = (event) => {
    const gesture = touchGestureRef.current;
    const touch = event.touches[0];
    if (!gesture || !touch) return;

    gesture.deltaX = touch.clientX - gesture.startX;
    gesture.deltaY = touch.clientY - gesture.startY;
    gesture.isVerticalScroll =
      Math.abs(gesture.deltaY) > Math.abs(gesture.deltaX) * 1.5;
  };

  const handleTouchEnd = (event) => {
    const gesture = touchGestureRef.current;
    const touch = event.changedTouches[0];
    touchGestureRef.current = null;
    if (!gesture || !touch) return;

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (gesture.isVerticalScroll || Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      return;
    }
    if (Math.abs(deltaX) >= SWIPE_CLOSE_THRESHOLD) dismiss();
  };

  return (
    <div
      className={isExiting ? 'ui-toast ui-toast--exiting' : 'ui-toast'}
      role="status"
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="ui-toast__content">
        <p className="ui-toast__text">{text}</p>
        {hasAction && (
          <button
            type="button"
            className="ui-toast__action"
            onClick={handleActionClick}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default Toast;
