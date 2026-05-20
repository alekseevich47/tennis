import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import IconButton from '../../components/ui/IconButton';

const SWIPE_NAV_THRESHOLD_PX = 56;

/**
 * @param {{
 *   items: Array<{ filename: string, url: string, isVideo: boolean }>,
 *   initialIndex?: number,
 *   onClose: () => void
 * }} props
 */
function FullscreenImageViewer({ items, initialIndex = 0, onClose }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const { scale, position, bgOpacity, reset, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePinchZoom({ onClose });

  const hasItems = items.length > 0;
  const activeItem = items[activeIndex] || null;
  const hasMultiple = items.length > 1;
  const isImage = activeItem && !activeItem.isVideo;

  const goTo = useCallback((nextIndex) => {
    if (items.length === 0) return;
    const normalizedIndex = (nextIndex + items.length) % items.length;
    setActiveIndex(normalizedIndex);
    reset();
  }, [items.length, reset]);

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    setActiveIndex(Math.min(initialIndex, Math.max(items.length - 1, 0)));
    reset();
  }, [initialIndex, items, reset]);

  useEffect(() => {
    if (!hasItems) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (hasMultiple && e.key === 'ArrowLeft') goPrev();
      if (hasMultiple && e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [goNext, goPrev, hasItems, hasMultiple, onClose]);

  useEffect(() => {
    if (!hasItems) reset();
  }, [hasItems, reset]);

  const counterText = useMemo(
    () => (hasMultiple ? `${activeIndex + 1} / ${items.length}` : ''),
    [activeIndex, hasMultiple, items.length]
  );

  const handleViewerTouchStart = (event) => {
    if (event.touches.length === 1) {
      touchStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
    if (isImage) handleTouchStart(event);
  };

  const handleViewerTouchMove = (event) => {
    if (isImage) handleTouchMove(event);
  };

  const handleViewerTouchEnd = (event) => {
    const changedTouch = event.changedTouches[0];
    const dx = changedTouch.clientX - touchStartRef.current.x;
    const dy = changedTouch.clientY - touchStartRef.current.y;

    if (
      hasMultiple &&
      scale === 1 &&
      Math.abs(dx) > SWIPE_NAV_THRESHOLD_PX &&
      Math.abs(dx) > Math.abs(dy) * 1.25
    ) {
      if (dx < 0) goNext();
      else goPrev();
      return;
    }

    if (isImage) handleTouchEnd();
  };

  if (!activeItem) return null;

  return (
    <div
      className="fullscreen-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр медиа"
      onClick={onClose}
      style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})` }}
    >
      {counterText && <div className="fullscreen-counter">{counterText}</div>}
      <IconButton
        ariaLabel="Закрыть просмотр"
        size="md"
        variant="ghost"
        className="fullscreen-close-btn"
        onClick={onClose}
      >
        <span aria-hidden="true">✕</span>
      </IconButton>
      <div
        className="fullscreen-image-wrapper"
        onClick={(e) => e.stopPropagation()}
        onWheel={isImage ? handleWheel : undefined}
        onTouchStart={handleViewerTouchStart}
        onTouchMove={handleViewerTouchMove}
        onTouchEnd={handleViewerTouchEnd}
      >
        {hasMultiple && (
          <>
            <button
              type="button"
              className="fullscreen-nav-zone fullscreen-nav-zone--left"
              onClick={goPrev}
              aria-label="Предыдущее медиа"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="fullscreen-nav-zone fullscreen-nav-zone--right"
              onClick={goNext}
              aria-label="Следующее медиа"
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        )}

        {activeItem.isVideo ? (
          <video
            src={activeItem.url}
            className="fullscreen-target-video"
            controls
            autoPlay
            playsInline
            aria-label={`Полноэкранное видео ${activeIndex + 1}`}
            width="1200"
            height="900"
          />
        ) : (
          <img
            src={activeItem.url}
            alt={`Полноразмерное изображение ${activeIndex + 1}`}
            className="fullscreen-target-img"
            width="1200"
            height="900"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
            }}
          />
        )}
      </div>
    </div>
  );
}

export default FullscreenImageViewer;
