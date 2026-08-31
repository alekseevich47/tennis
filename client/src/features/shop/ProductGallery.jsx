import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import FeedVideoPreview from '../feed/FeedVideoPreview';
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
    isSliding,
    trackTranslate,
    galleryRef,
    handleTouchStart,
    handleTouchMove,
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
  const [cardInViewport, setCardInViewport] = useState(false);

  useEffect(() => {
    if (isDetail) {
      setCardInViewport(false);
      return undefined;
    }
    const node = galleryRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setCardInViewport(Boolean(entry?.isIntersecting) && (entry?.intersectionRatio ?? 0) >= 0.35);
      },
      { threshold: [0, 0.35, 0.6, 1] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [galleryRef, isDetail, items.length, resetKey]);
  const prevItem = hasMultiple ? items[(index - 1 + items.length) % items.length] : null;
  const nextItem = hasMultiple ? items[(index + 1) % items.length] : null;
  const trackItems = hasMultiple && activeItem ? [prevItem, activeItem, nextItem] : activeItem ? [activeItem] : [];

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

  const renderMedia = useCallback(
    (item, { isCenter = false } = {}) => {
      if (!item) return null;

      const btnClass = isDetail ? 'product-detail-image-btn' : 'product-card-image-btn';
      const media = item.isVideo ? (
        <>
          <FeedVideoPreview
            src={item.url}
            alt={`Видео ${imageAlt}`}
            inViewport={!isDetail && isCenter && cardInViewport}
            showPlayBadge={!isDetail && isCenter}
          />
        </>
      ) : (
        <img
          src={isDetail ? item.url : (item.thumbUrl || item.url)}
          alt={isCenter ? imageAlt : ''}
          aria-hidden={isCenter ? undefined : 'true'}
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
      hiddenMediaKey,
      imageAlt,
      isDetail,
      cardInViewport,
      onCenterClick,
      onOpenFullscreen
    ]
  );

  return (
    <div
      ref={galleryRef}
      className={clsx(
        'product-gallery',
        isDetail ? 'product-gallery--detail' : 'product-gallery--card',
        isSliding && 'is-sliding'
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
