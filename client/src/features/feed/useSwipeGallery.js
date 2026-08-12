import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../../lib/gestures';

const SWIPE_THRESHOLD_PX = 36;

/**
 * Свайп галереи как в карточке магазина (ProductCard).
 *
 * @param {number} length
 * @param {string | number} [resetKey]
 */
export function useSwipeGallery(length, resetKey) {
  const [index, setIndex] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef(/** @type {number | null} */ (null));

  const safeIndex = clamp(index, 0, Math.max(length - 1, 0));
  const hasMultiple = length > 1;

  useEffect(() => {
    setIndex(0);
  }, [resetKey, length]);

  useEffect(
    () => () => {
      if (suppressClickTimerRef.current != null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    },
    []
  );

  const goTo = useCallback(
    (direction) => {
      if (length <= 1) return;
      setIndex((current) => (current + direction + length) % length);
    },
    [length]
  );

  const handleTouchStart = useCallback((event) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event) => {
      if (length <= 1) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      if (Math.abs(dx) <= SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

      suppressClickRef.current = true;
      if (suppressClickTimerRef.current != null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);
      goTo(dx < 0 ? 1 : -1);
    },
    [goTo, length]
  );

  const consumeSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    index: safeIndex,
    setIndex,
    hasMultiple,
    handleTouchStart,
    handleTouchEnd,
    consumeSuppressClick
  };
}
