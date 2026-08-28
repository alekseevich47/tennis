import React, { useCallback } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';
import { useGalleryNavigation } from './useGalleryNavigation';

/**
 * @typedef {{
 *   filename: string,
 *   url: string,
 *   thumbUrl?: string,
 *   isVideo: boolean,
 *   originKey: string
 * }} ProductGalleryItem
 */

/**
 * @param {{
 *   items: ProductGalleryItem[],
 *   resetKey?: string | number,
 *   index?: number,
 *   onIndexChange?: (index: number) => void,
 *   variant?: 'detail' | 'card',
 *   hiddenMediaKey?: string | null,
 *   disabled?: boolean,
 *   onOpenFullscreen?: (event: React.MouseEvent<HTMLElement>, index: number) => void,
 *   onCenterClick?: () => void,
 *   emptyLabel?: string,
 *   imageAlt?: string
 * }} props
 */
function ProductGallery({
  items,
  resetKey,
  index: controlledIndex,
  onIndexChange,
  variant = 'detail',
  hiddenMediaKey = null,
  disabled = false,
  onOpenFullscreen,
  onCenterClick,
  emptyLabel = 'Нет фото',
  imageAlt = 'Фото товара'
}) {
  const {
    index,
    setIndex,
    hasMultiple,
    handleTouchStart,
    handleTouchEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    consumeSuppressClick
  } = useGalleryNavigation(items.length, resetKey ?? items.length, {
    index: controlledIndex,
    onIndexChange
  });

  const activeItem = items[index] || null;
  const isDetail = variant === 'detail';

  const handleCenterClick = useCallback(
    (event) => {
      if (consumeSuppressClick()) return;
      if (onOpenFullscreen) {
        onOpenFullscreen(event, index);
        return;
      }
      onCenterClick?.();
    },
    [consumeSuppressClick, index, onCenterClick, onOpenFullscreen]
  );

  const goPrev = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!hasMultiple) return;
      setIndex((current) => (current - 1 + items.length) % items.length);
    },
    [hasMultiple, items.length, setIndex]
  );

  const goNext = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!hasMultiple) return;
      setIndex((current) => (current + 1) % items.length);
    },
    [hasMultiple, items.length, setIndex]
  );

  return (
    <div
      className={clsx('product-gallery', isDetail ? 'product-gallery--detail' : 'product-gallery--card')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {activeItem ? (
        <button
          type="button"
          className={clsx(
            isDetail ? 'product-detail-image-btn' : 'product-card-image-btn',
            hiddenMediaKey === activeItem.originKey && 'is-returning-origin'
          )}
          onClick={handleCenterClick}
          disabled={disabled && !onCenterClick}
          aria-label={onOpenFullscreen ? 'Открыть фото товара на весь экран' : undefined}
          data-media-origin-key={activeItem.originKey}
          data-section-swipe-ignore="true"
        >
          {activeItem.isVideo ? (
            <>
              <video
                src={videoPreviewUrl(activeItem.url)}
                muted
                playsInline
                preload="metadata"
                aria-label={`Видео ${imageAlt}`}
              />
              {!isDetail && (
                <span className="product-card-video-badge" aria-hidden="true">▶</span>
              )}
            </>
          ) : (
            <img
              src={isDetail ? activeItem.url : (activeItem.thumbUrl || activeItem.url)}
              alt={imageAlt}
            />
          )}
        </button>
      ) : (
        onCenterClick || onOpenFullscreen ? (
          <button
            type="button"
            className={isDetail ? 'product-detail-no-image' : 'no-image'}
            onClick={handleCenterClick}
          >
            {emptyLabel}
          </button>
        ) : (
          <div className={isDetail ? 'product-detail-no-image' : 'no-image'}>{emptyLabel}</div>
        )
      )}

      {hasMultiple && isDetail && (
        <>
          <button
            type="button"
            className="product-gallery-zone product-gallery-zone--prev"
            onClick={goPrev}
            aria-label="Предыдущее фото"
          />
          <button
            type="button"
            className="product-gallery-zone product-gallery-zone--next"
            onClick={goNext}
            aria-label="Следующее фото"
          />
        </>
      )}

      {hasMultiple && (
        <div
          className={isDetail ? 'product-gallery-dots' : 'product-card-dots'}
          aria-label="Фото товара"
        >
          {items.map((item, dotIndex) => (
            <button
              key={item.filename}
              type="button"
              className={dotIndex === index ? 'is-active' : ''}
              onClick={(event) => {
                event.stopPropagation();
                setIndex(dotIndex);
              }}
              aria-label={`Показать фото ${dotIndex + 1}`}
              aria-current={dotIndex === index ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductGallery;
