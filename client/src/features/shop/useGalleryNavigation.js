import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../../lib/gestures';

const SWIPE_THRESHOLD_PX = 36;

/**
 * Touch + pointer drag gallery navigation (ProductCard / ProductDetail).
 *
 * @param {number} length
 * @param {string | number} [resetKey]
 * @param {{ index?: number, onIndexChange?: (index: number) => void }} [options]
 */
export function useGalleryNavigation(length, resetKey, { index: controlledIndex, onIndexChange } = {}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const index = controlledIndex ?? internalIndex;
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0, active: false, dragging: false });
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef(/** @type {number | null} */ (null));

  const safeIndex = clamp(index, 0, Math.max(length - 1, 0));
  const hasMultiple = length > 1;

  const setIndex = useCallback(
    (next) => {
      const value = typeof next === 'function' ? next(safeIndex) : next;
      const clamped = clamp(value, 0, Math.max(length - 1, 0));
      if (onIndexChange) onIndexChange(clamped);
      else setInternalIndex(clamped);
    },
    [length, onIndexChange, safeIndex]
  );

  useEffect(() => {
    if (onIndexChange) onIndexChange(0);
    else setInternalIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on product change only
  }, [resetKey]);

  useEffect(
    () => () => {
      if (suppressClickTimerRef.current != null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    },
    []
  );

  const suppressClick = useCallback(() => {
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current != null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 350);
  }, []);

  const goTo = useCallback(
    (direction) => {
      if (length <= 1) return;
      setIndex((current) => (current + direction + length) % length);
    },
    [length, setIndex]
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

      suppressClick();
      goTo(dx < 0 ? 1 : -1);
    },
    [goTo, length, suppressClick]
  );

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'touch') return;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      active: true,
      dragging: false
    };
  }, []);

  const handlePointerMove = useCallback((event) => {
    const state = pointerStartRef.current;
    if (!state.active || event.pointerType === 'touch') return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      pointerStartRef.current = { ...state, dragging: true };
    }
  }, []);

  const handlePointerUp = useCallback(
    (event) => {
      const state = pointerStartRef.current;
      if (!state.active || event.pointerType === 'touch') return;
      pointerStartRef.current = { x: 0, y: 0, active: false, dragging: false };

      if (!state.dragging || length <= 1) return;
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (Math.abs(dx) <= SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

      suppressClick();
      goTo(dx < 0 ? 1 : -1);
    },
    [goTo, length, suppressClick]
  );

  const handlePointerCancel = useCallback(() => {
    pointerStartRef.current = { x: 0, y: 0, active: false, dragging: false };
  }, []);

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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    consumeSuppressClick
  };
}
