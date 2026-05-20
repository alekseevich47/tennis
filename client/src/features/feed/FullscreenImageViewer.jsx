import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import IconButton from '../../components/ui/IconButton';

const SWIPE_NAV_THRESHOLD_PX = 36;
const NAV_CLICK_DRIFT_PX = 8;
const NAV_ZOOM_MAX_SCALE = 1.05;
const GESTURE_LOCK_PX = 10;
const SLIDE_ANIMATION_MS = 240;

function getWindowWidth() {
  return window.innerWidth || document.documentElement.clientWidth || 360;
}

/**
 * @param {{
 *   items: Array<{ filename: string, url: string, isVideo: boolean }>,
 *   initialIndex?: number,
 *   originRect?: DOMRect | null,
 *   onClose: () => void
 * }} props
 */
function FullscreenImageViewer({ items, initialIndex = 0, originRect = null, onClose }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pointerDownRef = useRef({ x: 0, y: 0 });
  const gestureModeRef = useRef('idle');
  const wheelTargetRef = useRef(null);
  const slideTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const requestClose = useCallback(() => {
    if (isClosing) return;
    if (!originRect) {
      onClose();
      return;
    }
    setIsClosing(true);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(onClose, SLIDE_ANIMATION_MS);
  }, [isClosing, onClose, originRect]);
  const {
    scale,
    position,
    bgOpacity,
    reset,
    handleWheel,
    handlePointerDown: handleZoomPointerDown,
    handlePointerMove: handleZoomPointerMove,
    handlePointerUp: handleZoomPointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = usePinchZoom({ onClose: requestClose });

  const hasItems = items.length > 0;
  const activeItem = items[activeIndex] || null;
  const hasMultiple = items.length > 1;
  const isImage = activeItem && !activeItem.isVideo;

  const goTo = useCallback((nextIndex, { animated = false } = {}) => {
    if (items.length === 0) return;
    const normalizedIndex = (nextIndex + items.length) % items.length;
    if (animated && normalizedIndex !== activeIndex) {
      const direction = normalizedIndex > activeIndex || (activeIndex === items.length - 1 && normalizedIndex === 0)
        ? -1
        : 1;
      window.clearTimeout(slideTimerRef.current);
      setIsSliding(true);
      setSwipeOffset(direction * getWindowWidth());
      slideTimerRef.current = window.setTimeout(() => {
        setActiveIndex(normalizedIndex);
        setIsSliding(false);
        setSwipeOffset(0);
        reset();
      }, SLIDE_ANIMATION_MS);
      return;
    }
    setActiveIndex(normalizedIndex);
    setSwipeOffset(0);
    setIsSliding(false);
    reset();
  }, [activeIndex, items.length, reset]);

  const goNext = useCallback((options) => goTo(activeIndex + 1, options), [activeIndex, goTo]);
  const goPrev = useCallback((options) => goTo(activeIndex - 1, options), [activeIndex, goTo]);

  useEffect(() => {
    setIsClosing(false);
    window.clearTimeout(closeTimerRef.current);
    setActiveIndex(Math.min(initialIndex, Math.max(items.length - 1, 0)));
    setSwipeOffset(0);
    setIsSliding(false);
    gestureModeRef.current = 'idle';
    reset();
  }, [initialIndex, items, reset]);

  useEffect(() => {
    if (!hasItems) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') requestClose();
      if (hasMultiple && e.key === 'ArrowLeft') goPrev();
      if (hasMultiple && e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [goNext, goPrev, hasItems, hasMultiple, requestClose]);

  useEffect(() => {
    if (!hasItems) reset();
  }, [hasItems, reset]);

  useEffect(() => {
    return () => {
      window.clearTimeout(slideTimerRef.current);
      window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const node = wheelTargetRef.current;
    if (!node || !isImage) return undefined;
    const handleNativeWheel = (event) => {
      event.preventDefault();
      handleWheel(event);
    };
    node.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleNativeWheel);
  }, [handleWheel, isImage, activeIndex]);

  const counterText = useMemo(
    () => (hasMultiple ? `${activeIndex + 1} / ${items.length}` : ''),
    [activeIndex, hasMultiple, items.length]
  );

  const handleViewerTouchStart = (event) => {
    gestureModeRef.current = 'pending';
    if (event.touches.length === 1) {
      touchStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
    if (isImage || activeItem?.isVideo) handleTouchStart(event);
  };

  const handleViewerTouchMove = (event) => {
    if (event.touches.length !== 1) {
      if (isImage) handleTouchMove(event);
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (gestureModeRef.current === 'pending') {
      if (
        hasMultiple &&
        scale <= NAV_ZOOM_MAX_SCALE &&
        Math.abs(dx) > GESTURE_LOCK_PX &&
        Math.abs(dx) > Math.abs(dy) * 1.35
      ) {
        gestureModeRef.current = 'horizontal';
      } else if (
        Math.abs(dy) > GESTURE_LOCK_PX &&
        Math.abs(dy) > Math.abs(dx) * 1.25
      ) {
        gestureModeRef.current = 'vertical';
      } else {
        return;
      }
    }

    if (gestureModeRef.current === 'horizontal') {
      setSwipeOffset(dx);
      return;
    }

    if (gestureModeRef.current === 'vertical' && (isImage || activeItem?.isVideo)) {
      handleTouchMove(event);
    }
  };

  const handleViewerTouchEnd = (event) => {
    const changedTouch = event.changedTouches[0];
    const dx = changedTouch.clientX - touchStartRef.current.x;
    const dy = changedTouch.clientY - touchStartRef.current.y;

    if (gestureModeRef.current === 'horizontal') {
      if (Math.abs(dx) > SWIPE_NAV_THRESHOLD_PX) {
        if (dx < 0) goNext({ animated: true });
        else goPrev({ animated: true });
      } else {
        setIsSliding(true);
        setSwipeOffset(0);
        window.setTimeout(() => setIsSliding(false), SLIDE_ANIMATION_MS);
      }
      gestureModeRef.current = 'idle';
      return;
    }

    if ((isImage || activeItem?.isVideo) && gestureModeRef.current === 'vertical') {
      handleTouchEnd();
    }
    gestureModeRef.current = 'idle';
  };

  const handleWrapperPointerDown = (event) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
    if (event.target instanceof Element && event.target.closest('button')) return;
    if (isImage) handleZoomPointerDown(event);
  };

  const handleContentClick = (event) => {
    event.stopPropagation();
    if (!hasMultiple) return;
    if (event.target instanceof Element && event.target.closest('button')) return;

    const dx = Math.abs(event.clientX - pointerDownRef.current.x);
    const dy = Math.abs(event.clientY - pointerDownRef.current.y);
    if (dx > NAV_CLICK_DRIFT_PX || dy > NAV_CLICK_DRIFT_PX) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (scale > NAV_ZOOM_MAX_SCALE) return;
    if (x < rect.width * 0.38) goPrev({ animated: true });
    if (x > rect.width * 0.62) goNext({ animated: true });
  };

  const prevItem = items[(activeIndex - 1 + items.length) % items.length];
  const nextItem = items[(activeIndex + 1) % items.length];
  const trackItems = hasMultiple ? [prevItem, activeItem, nextItem] : [activeItem];
  const trackTranslate = hasMultiple ? `calc(-100% + ${swipeOffset}px)` : `${swipeOffset}px`;
  const returnTransform = useMemo(() => {
    if (!originRect) return null;
    const viewportWidth = getWindowWidth();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;
    const dx = originRect.left + originRect.width / 2 - viewportWidth / 2;
    const dy = originRect.top + originRect.height / 2 - viewportHeight / 2;
    const targetScale = Math.max(
      0.12,
      Math.min(originRect.width / viewportWidth, originRect.height / viewportHeight)
    );
    return `translate(${dx}px, ${dy}px) scale(${targetScale})`;
  }, [originRect]);

  if (!activeItem) return null;

  return (
    <div
      className="fullscreen-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр медиа"
      onClick={requestClose}
      style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})` }}
      data-closing={isClosing ? 'true' : undefined}
    >
      {counterText && <div className="fullscreen-counter">{counterText}</div>}
      <IconButton
        ariaLabel="Закрыть просмотр"
        size="md"
        variant="ghost"
        className="fullscreen-close-btn"
        onClick={requestClose}
      >
        <span aria-hidden="true">✕</span>
      </IconButton>
      <div
        ref={wheelTargetRef}
        className="fullscreen-image-wrapper"
        onClick={handleContentClick}
        onPointerDown={handleWrapperPointerDown}
        onPointerMove={isImage ? handleZoomPointerMove : undefined}
        onPointerUp={isImage ? handleZoomPointerUp : undefined}
        onPointerCancel={isImage ? handleZoomPointerUp : undefined}
        onTouchStart={handleViewerTouchStart}
        onTouchMove={handleViewerTouchMove}
        onTouchEnd={handleViewerTouchEnd}
      >
        {hasMultiple && (
          <>
            <button
              type="button"
              className="fullscreen-nav-zone fullscreen-nav-zone--left"
              onClick={() => goPrev({ animated: true })}
              aria-label="Предыдущее медиа"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="fullscreen-nav-zone fullscreen-nav-zone--right"
              onClick={() => goNext({ animated: true })}
              aria-label="Следующее медиа"
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        )}

        <div
          className={`fullscreen-carousel-track ${isSliding ? 'is-sliding' : ''}`}
          style={{ transform: `translate3d(${trackTranslate}, 0, 0)` }}
        >
          {trackItems.map((item, index) => {
            const isActiveSlide = !hasMultiple || index === 1;
            return (
              <div
                className="fullscreen-carousel-slide"
                data-active={isActiveSlide ? 'true' : undefined}
                key={`${item.filename}-${index}`}
              >
                {item.isVideo ? (
                  <video
                    src={item.url}
                    className="fullscreen-target-video"
                    controls
                    autoPlay={isActiveSlide}
                    playsInline
                    aria-label={`Полноэкранное видео ${activeIndex + 1}`}
                    width="1200"
                    height="900"
                    style={{
                      transform: isClosing && isActiveSlide && returnTransform
                        ? returnTransform
                        : isActiveSlide
                        ? `translate(${position.x}px, ${position.y}px)`
                        : undefined
                    }}
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={`Полноразмерное изображение ${activeIndex + 1}`}
                    className="fullscreen-target-img"
                    width="1200"
                    height="900"
                    style={{
                      transform: isClosing && isActiveSlide && returnTransform
                        ? returnTransform
                        : isActiveSlide
                        ? `translate(${position.x}px, ${position.y}px) scale(${scale})`
                        : undefined
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FullscreenImageViewer;
