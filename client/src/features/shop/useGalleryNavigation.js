import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../../lib/gestures';

const SWIPE_THRESHOLD_PX = 36;
const GESTURE_LOCK_PX = 8;
const SLIDE_ANIMATION_MS = 240;

const IGNORE_TOUCH_SELECTOR =
  '.product-gallery-zone, .product-gallery-dots, .product-card-dots';

/**
 * Touch + pointer drag gallery navigation with live offset (ProductCard / ProductDetail).
 *
 * @param {number} length
 * @param {string | number} [resetKey]
 * @param {{ index?: number, onIndexChange?: (index: number) => void, skipMouseDrag?: boolean }} [options]
 */
export function useGalleryNavigation(length, resetKey, { index: controlledIndex, onIndexChange, skipMouseDrag = false } = {}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [isHorizontalDrag, setIsHorizontalDrag] = useState(false);
  const index = controlledIndex ?? internalIndex;
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const gestureModeRef = useRef('idle');
  const galleryRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const slideTimerRef = useRef(/** @type {number | null} */ (null));
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef(/** @type {number | null} */ (null));
  const lengthRef = useRef(length);
  lengthRef.current = length;

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

  const setIndexRef = useRef(setIndex);
  setIndexRef.current = setIndex;

  const getWidth = useCallback(
    () => galleryRef.current?.offsetWidth || window.innerWidth || 1,
    []
  );

  useEffect(() => {
    if (onIndexChange) onIndexChange(0);
    else setInternalIndex(0);
    setSwipeOffset(0);
    setIsSliding(false);
    setIsHorizontalDrag(false);
    gestureModeRef.current = 'idle';
    if (slideTimerRef.current != null) {
      window.clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on product change only
  }, [resetKey]);

  useEffect(
    () => () => {
      if (suppressClickTimerRef.current != null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      if (slideTimerRef.current != null) {
        window.clearTimeout(slideTimerRef.current);
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

  const snapBack = useCallback(() => {
    setIsSliding(true);
    setSwipeOffset(0);
    window.clearTimeout(slideTimerRef.current);
    slideTimerRef.current = window.setTimeout(() => {
      setIsSliding(false);
    }, SLIDE_ANIMATION_MS);
  }, []);

  const completeSlide = useCallback(
    (direction) => {
      if (lengthRef.current <= 1) return;
      const width = getWidth();
      window.clearTimeout(slideTimerRef.current);
      setIsSliding(true);
      setSwipeOffset(direction > 0 ? -width : width);
      slideTimerRef.current = window.setTimeout(() => {
        setIndexRef.current((current) => (current + direction + lengthRef.current) % lengthRef.current);
        setIsSliding(false);
        setSwipeOffset(0);
      }, SLIDE_ANIMATION_MS);
    },
    [getWidth]
  );

  const finishHorizontalDrag = useCallback(
    (dx) => {
      if (lengthRef.current <= 1) {
        setSwipeOffset(0);
        gestureModeRef.current = 'idle';
        setIsHorizontalDrag(false);
        return;
      }

      if (Math.abs(dx) > SWIPE_THRESHOLD_PX) {
        suppressClick();
        completeSlide(dx < 0 ? 1 : -1);
      } else {
        snapBack();
      }
      gestureModeRef.current = 'idle';
      setIsHorizontalDrag(false);
    },
    [completeSlide, snapBack, suppressClick]
  );

  const tryLockHorizontal = useCallback((dx, dy) => {
    if (gestureModeRef.current !== 'pending') return;
    if (Math.abs(dx) > GESTURE_LOCK_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
      gestureModeRef.current = 'horizontal';
      setIsHorizontalDrag(true);
    }
  }, []);

  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return undefined;

    const onTouchStart = (/** @type {TouchEvent} */ event) => {
      if (lengthRef.current <= 1) return;
      if (event.touches.length !== 1) return;
      if (event.target instanceof Element && event.target.closest(IGNORE_TOUCH_SELECTOR)) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      window.clearTimeout(slideTimerRef.current);
      setIsSliding(false);
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      gestureModeRef.current = 'pending';
    };

    const onTouchMove = (/** @type {TouchEvent} */ event) => {
      if (lengthRef.current <= 1 || gestureModeRef.current === 'idle') return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;

      tryLockHorizontal(dx, dy);
      if (gestureModeRef.current === 'horizontal') {
        if (event.cancelable) event.preventDefault();
        setSwipeOffset(dx);
      }
    };

    const onTouchEnd = (/** @type {TouchEvent} */ event) => {
      if (lengthRef.current <= 1) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartRef.current.x;

      if (gestureModeRef.current === 'horizontal') {
        finishHorizontalDrag(dx);
        return;
      }
      gestureModeRef.current = 'idle';
      setIsHorizontalDrag(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [finishHorizontalDrag, tryLockHorizontal, resetKey]);

  const handlePointerDown = useCallback(
    (event) => {
      if (event.pointerType === 'touch' || length <= 1) return;
      if (skipMouseDrag && event.pointerType === 'mouse') return;
      if (
        event.target instanceof Element &&
        event.target.closest('.product-gallery-zone, .product-gallery-dots, .product-card-dots')
      ) {
        return;
      }
      window.clearTimeout(slideTimerRef.current);
      setIsSliding(false);
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
      gestureModeRef.current = 'pending';
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [length, skipMouseDrag]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (event.pointerType === 'touch' || length <= 1 || gestureModeRef.current === 'idle') return;
      const dx = event.clientX - pointerStartRef.current.x;
      const dy = event.clientY - pointerStartRef.current.y;

      tryLockHorizontal(dx, dy);
      if (gestureModeRef.current === 'horizontal') {
        event.preventDefault();
        setSwipeOffset(dx);
      }
    },
    [length, tryLockHorizontal]
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (event.pointerType === 'touch') return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);

      if (gestureModeRef.current === 'horizontal') {
        const dx = event.clientX - pointerStartRef.current.x;
        finishHorizontalDrag(dx);
        return;
      }
      gestureModeRef.current = 'idle';
    },
    [finishHorizontalDrag]
  );

  const handlePointerCancel = useCallback(
    (event) => {
      if (gestureModeRef.current === 'horizontal') {
        snapBack();
      }
      gestureModeRef.current = 'idle';
      setIsHorizontalDrag(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [snapBack]
  );

  const consumeSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const trackTranslate = hasMultiple ? `calc(-100% + ${swipeOffset}px)` : `${swipeOffset}px`;

  return {
    index: safeIndex,
    setIndex,
    hasMultiple,
    swipeOffset,
    isSliding,
    isHorizontalDrag,
    trackTranslate,
    galleryRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    consumeSuppressClick
  };
}
