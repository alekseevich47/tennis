import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SWIPE_CLOSE_THRESHOLD } from '../../lib/gestures';
import './Toast.css';

function Toast({ text, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const touchGestureRef = useRef(null);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsExiting(true);
    window.setTimeout(() => onDismiss?.(), 180);
  }, [onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(dismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

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
      {text}
    </div>
  );
}

export default Toast;
