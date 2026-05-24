import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useProductCategories } from '../../hooks/useProductCategories';
import { clamp } from '../../lib/gestures';
import { getMediaUrl, isVideoMediaName, mediaNames, videoPreviewUrl } from '../../lib/media';

const SWIPE_THRESHOLD_PX = 36;

function getProductCategoryIds(product) {
  return Array.isArray(product?.categories) ? product.categories : [];
}

/**
 * @param {{
 *   product: import('../../services/catalog').ProductRecord,
 *   isSoftDeleted?: boolean,
 *   moderator?: boolean,
 *   hiddenMediaKey?: string | null,
 *   onOpen: (product: any) => void,
 *   onDelete?: (productId: string) => void,
 *   onRestore?: (productId: string) => void,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function ProductCard({
  product,
  isSoftDeleted = false,
  moderator = false,
  hiddenMediaKey = null,
  onOpen,
  onDelete,
  onRestore,
  onOpenFullscreen
}) {
  const { data: categories = [] } = useProductCategories();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef(null);

  const galleryItems = useMemo(() => (
    mediaNames(product.images).flatMap((filename, index) => {
      const url = getMediaUrl(product, 'products', filename);
      if (!url) return [];
      return [{
        filename,
        url,
        isVideo: isVideoMediaName(filename),
        originKey: `product-card-${product.id}-${index}`
      }];
    })
  ), [product]);

  const categoryNames = useMemo(() => {
    const categoryIds = getProductCategoryIds(product);
    if (categoryIds.length === 0) return [];

    const expandedCategories = product?.expand?.categories;
    if (Array.isArray(expandedCategories) && expandedCategories.length > 0) {
      return expandedCategories
        .filter((category) => categoryIds.includes(category.id))
        .map((category) => category.name)
        .filter(Boolean);
    }

    return categories
      .filter((category) => categoryIds.includes(category.id))
      .map((category) => category.name)
      .filter(Boolean);
  }, [categories, product]);

  const safeImageIndex = clamp(currentImageIndex, 0, Math.max(galleryItems.length - 1, 0));
  const activeItem = galleryItems[safeImageIndex] || null;
  const hasMultipleImages = galleryItems.length > 1;

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product.id, product.images]);

  useEffect(() => () => {
    window.clearTimeout(suppressClickTimerRef.current);
  }, []);

  const openProduct = useCallback(() => onOpen(product), [onOpen, product]);

  const goToImage = useCallback((direction) => {
    if (galleryItems.length <= 1) return;
    setCurrentImageIndex((current) =>
      (current + direction + galleryItems.length) % galleryItems.length
    );
  }, [galleryItems.length]);

  const handleTouchStart = useCallback((event) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((event) => {
    if (galleryItems.length <= 1) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (Math.abs(dx) <= SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

    suppressClickRef.current = true;
    window.clearTimeout(suppressClickTimerRef.current);
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 350);
    goToImage(dx < 0 ? 1 : -1);
  }, [galleryItems.length, goToImage]);

  const handleOpenFullscreen = useCallback((event) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (!activeItem || !onOpenFullscreen) {
      openProduct();
      return;
    }

    onOpenFullscreen(
      galleryItems,
      safeImageIndex,
      event.currentTarget.getBoundingClientRect(),
      activeItem.originKey
    );
  }, [activeItem, galleryItems, onOpenFullscreen, openProduct, safeImageIndex]);

  const handleDelete = useCallback(() => {
    onDelete?.(product.id);
  }, [onDelete, product.id]);

  const handleRestore = useCallback(() => {
    onRestore?.(product.id);
  }, [onRestore, product.id]);

  const handleInfoKeyDown = useCallback((event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openProduct();
  }, [openProduct]);

  return (
    <article className={clsx('product-card', isSoftDeleted && 'product-card--soft-deleted')}>
      {moderator && !isSoftDeleted && (
        <button
          type="button"
          className="product-card-delete-btn"
          onClick={handleDelete}
          aria-label="Удалить товар"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <div className="product-image">
        {activeItem ? (
          <button
            type="button"
            className={clsx(
              'product-card-image-btn',
              hiddenMediaKey === activeItem.originKey && 'is-returning-origin'
            )}
            onClick={handleOpenFullscreen}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            data-media-origin-key={activeItem.originKey}
            aria-label="Открыть фото товара на весь экран"
          >
            {activeItem.isVideo ? (
              <>
                <video
                  src={videoPreviewUrl(activeItem.url)}
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={`Видео товара ${product.title || ''}`}
                />
                <span className="product-card-video-badge" aria-hidden="true">▶</span>
              </>
            ) : (
              <img src={activeItem.url} alt={`Фото товара ${product.title || 'без названия'}`} />
            )}
          </button>
        ) : (
          <button type="button" className="no-image" onClick={openProduct}>
            Нет фото
          </button>
        )}

        {hasMultipleImages && (
          <div className="product-card-dots" aria-label="Фото товара">
            {galleryItems.map((item, index) => (
              <button
                key={item.filename}
                type="button"
                className={index === safeImageIndex ? 'is-active' : ''}
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`Показать фото ${index + 1}`}
                aria-current={index === safeImageIndex ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="product-info"
        role="button"
        tabIndex={0}
        onClick={openProduct}
        onKeyDown={handleInfoKeyDown}
      >
        <h3>
          <span className="product-card-title-text">
            {product.title}
          </span>
        </h3>
        {categoryNames.length > 0 && (
          <div className="product-card-category-chips" aria-label="Категории товара">
            {categoryNames.slice(0, 3).map((name) => (
              <span key={name} className="product-category-chip">{name}</span>
            ))}
          </div>
        )}
        <p className="price">{product.price} ₽</p>
        {product.out_of_stock && (
          <span className="product-out-of-stock-badge">Нет в наличии</span>
        )}
      </div>

      {isSoftDeleted && (
        <div className="product-card-soft-delete-overlay">
          <div className="soft-deleted-text-group">
            <p className="soft-deleted-title">Удалено</p>
            <p className="soft-deleted-subtitle">Товар можно восстановить</p>
          </div>
          <button type="button" className="restore-product-btn" onClick={handleRestore}>
            Восстановить
          </button>
        </div>
      )}
    </article>
  );
}

export default memo(ProductCard);
