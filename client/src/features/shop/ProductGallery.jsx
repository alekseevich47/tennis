import React, { useCallback } from 'react';
import clsx from 'clsx';
import FeedVideoPreview from '../feed/FeedVideoPreview';
import { useGalleryNavigation } from './useGalleryNavigation';

/**
 * @typedef {{
 *   filename: string,
 *   url: string,
 *   thumbUrl?: string,
 *   previewUrl?: string,
 *   isVideo: boolean,
 *   originKey: string
 * }} ProductGalleryItem
 */

/** @param {ProductGalleryItem} item */
function slideId(item) {
  return item.originKey || item.filename;
}

/**
 * @param {ProductGalleryItem} item
 * @param {number} slideIndex
 * @param {ProductGalleryItem[]} trackItems
 */
function carouselSlideKey(item, slideIndex, trackItems) {
  const id = slideId(item);
  const first = trackItems.findIndex((other) => slideId(other) === id);
  return `${id}-${slideIndex - first}`;
}

/**
 * @param {{
 *   items: ProductGalleryItem[],
 *   resetKey?: string | number,
 *   index?: number,
 *   onIndexChange?: (index: number) => void,
 *   variant?: 'detail' | 'card',
 *   hiddenMediaKey?: string | null,
 *   disabled?: boolean,
 *   mediaEnabled?: boolean,
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
  mediaEnabled = true,
  onOpenFullscreen,
  onCenterClick,
  emptyLabel = 'Нет фото',
  imageAlt = 'Фото товара'
}) {
  const {
    index,
    setIndex,
    hasMultiple,
    isSliding,
    isHorizontalDrag,
    trackTranslate,
    galleryRef,
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
  const shouldLoadMedia = isDetail || mediaEnabled;
  const prevItem = hasMultiple ? items[(index - 1 + items.length) % items.length] : null;
  const nextItem = hasMultiple ? items[(index + 1) % items.length] : null;
  const trackItems = hasMultiple && activeItem ? [prevItem, activeItem, nextItem] : activeItem ? [activeItem] : [];

  const handleCenterClick = useCallback(
    (event) => {
      if (consumeSuppressClick()) return;
      if (onOpenFullscreen) {
        onOpenFullscreen(event, index);
        event.stopPropagation();
        return;
      }
      onCenterClick?.();
      if (!isDetail) event.stopPropagation();
    },
    [consumeSuppressClick, index, isDetail, onCenterClick, onOpenFullscreen]
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

  const renderMedia = useCallback(
    (item, { isCenter = false } = {}) => {
      if (!item) return null;

      const btnClass = isDetail ? 'product-detail-image-btn' : 'product-card-image-btn';
      const loadThisSlide = shouldLoadMedia && (isCenter || !hasMultiple || isDetail);

      if (!loadThisSlide) {
        return (
          <div className={clsx(btnClass, 'product-gallery-media-placeholder')} aria-hidden="true">
            <span className="product-gallery-media-placeholder__shimmer" />
          </div>
        );
      }

      const media = item.isVideo ? (
        isCenter || !hasMultiple ? (
          <FeedVideoPreview
            src={item.url}
            poster={item.thumbUrl || item.previewUrl}
            active={isCenter || !isDetail}
            alt={`Видео ${imageAlt}`}
          />
        ) : (
          <img
            src={item.thumbUrl || item.url}
            alt=""
            aria-hidden="true"
          />
        )
      ) : (
        <img
          src={isDetail ? item.url : (item.thumbUrl || item.url)}
          alt={isCenter ? imageAlt : ''}
          aria-hidden={isCenter ? undefined : 'true'}
          loading="lazy"
        />
      );

      if (isCenter) {
        return (
          <button
            type="button"
            className={clsx(
              btnClass,
              hiddenMediaKey === item.originKey && 'is-returning-origin'
            )}
            onClick={handleCenterClick}
            disabled={disabled && !onCenterClick}
            aria-label={onOpenFullscreen ? 'Открыть фото товара на весь экран' : undefined}
            data-media-origin-key={item.originKey}
            data-section-swipe-ignore="true"
          >
            {media}
          </button>
        );
      }

      return (
        <div className={btnClass} aria-hidden="true">
          {media}
        </div>
      );
    },
    [
      disabled,
      handleCenterClick,
      hasMultiple,
      hiddenMediaKey,
      imageAlt,
      isDetail,
      onCenterClick,
      onOpenFullscreen,
      shouldLoadMedia
    ]
  );

  return (
    <div
      ref={galleryRef}
      className={clsx(
        'product-gallery',
        isDetail ? 'product-gallery--detail' : 'product-gallery--card',
        isSliding && 'is-sliding',
        isHorizontalDrag && 'is-horizontal-drag'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {trackItems.length > 0 ? (
        hasMultiple ? (
          <div
            className={clsx('product-gallery-track', isSliding && 'is-sliding')}
            style={{ transform: `translate3d(${trackTranslate}, 0, 0)` }}
          >
            {trackItems.map((item, slideIndex) => (
              <div
                key={carouselSlideKey(item, slideIndex, trackItems)}
                className="product-gallery-slide"
              >
                {renderMedia(item, { isCenter: slideIndex === 1 })}
              </div>
            ))}
          </div>
        ) : (
          renderMedia(activeItem, { isCenter: true })
        )
      ) : onCenterClick || onOpenFullscreen ? (
        <button
          type="button"
          className={isDetail ? 'product-detail-no-image' : 'no-image'}
          onClick={handleCenterClick}
        >
          {emptyLabel}
        </button>
      ) : (
        <div className={isDetail ? 'product-detail-no-image' : 'no-image'}>{emptyLabel}</div>
      )}

      {hasMultiple && (
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
