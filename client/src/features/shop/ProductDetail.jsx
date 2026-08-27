import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useFavorites } from '../../context/FavoritesContext';
import { useProductCategories } from '../../hooks/useProductCategories';
import BuyButton from './BuyButton';
import ProductPrice from './ProductPrice';
import { getMediaThumbUrl, getMediaUrl, isVideoMediaName, mediaNames, videoPreviewUrl } from '../../lib/media';
import { useKeepForModalClose } from '../../hooks/useKeepForModalClose';
import { normalizeProductCategoryIds } from './productCategories';

const SWIPE_THRESHOLD_PX = 36;

/**
 * @param {{
 *   isOpen: boolean,
 *   product: any | null,
 *   moderator: boolean,
 *   onClose: () => void,
 *   onEdit: () => void,
 *   onDelete: () => Promise<void> | void,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function ProductDetail({
  isOpen,
  product: productProp,
  moderator,
  onClose,
  onEdit,
  onDelete,
  onOpenFullscreen
}) {
  const product = useKeepForModalClose(isOpen, productProp);
  const { alert } = useAlertDialog();
  const { data: categories = [] } = useProductCategories();
  const { isFavorite, addItem, removeItem } = useFavorites();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef(null);

  const galleryItems = useMemo(() => {
    if (!product) return [];
    return mediaNames(product.images).flatMap((filename) => {
      const url = getMediaUrl(product, 'products', filename);
      if (!url) return [];
      const thumbUrl = isVideoMediaName(filename)
        ? url
        : getMediaThumbUrl(product, 'products', filename, '600x0') || url;
      return [{
        filename,
        url,
        thumbUrl,
        previewUrl: thumbUrl,
        isVideo: isVideoMediaName(filename),
        originKey: `product-detail-${product.id}-${filename}`
      }];
    });
  }, [product]);

  const selectedCategoryNames = useMemo(() => {
    const categoryIds = normalizeProductCategoryIds(product?.categories);
    if (categoryIds.length === 0) return [];

    const expandedCategories = product?.expand?.categories;
    if (Array.isArray(expandedCategories) && expandedCategories.length > 0) {
      return expandedCategories
        .filter((category) => categoryIds.includes(category.id))
        .map((category) => category.name)
        .filter(Boolean);
    }

    if (expandedCategories && typeof expandedCategories === 'object' && expandedCategories.id) {
      return categoryIds.includes(expandedCategories.id) && expandedCategories.name
        ? [expandedCategories.name]
        : [];
    }

    return categories
      .filter((category) => categoryIds.includes(category.id))
      .map((category) => category.name)
      .filter(Boolean);
  }, [categories, product]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentImageIndex(0);
  }, [isOpen, product?.id]);

  useEffect(() => {
    setViewsCount(Number(product?.views) || 0);
    setFavoritesCount(Math.max(0, Number(product?.favorites_count) || 0));
  }, [product?.id, product?.views, product?.favorites_count]);

  useEffect(() => () => {
    window.clearTimeout(suppressClickTimerRef.current);
  }, []);

  const handleFavoriteClick = useCallback((event) => {
    event.stopPropagation();
    if (!product) return;
    if (isFavorite(product.id)) {
      removeItem(product.id);
      setFavoritesCount((count) => Math.max(0, count - 1));
    } else {
      addItem(product);
      setFavoritesCount((count) => count + 1);
    }
  }, [isFavorite, addItem, removeItem, product]);

  if (!product) return null;

  const favorited = isFavorite(product.id);

  const handleCopyArticle = async () => {
    try {
      await navigator.clipboard.writeText(`#${product.id}`);
      await alert({ title: 'Скопировано', message: 'Артикул скопирован в буфер обмена.' });
    } catch {
      await alert({ title: 'Не получилось', message: 'Скопируйте артикул вручную.' });
    }
  };

  const goToImage = (direction) => {
    if (galleryItems.length <= 1) return;
    setCurrentImageIndex((current) =>
      (current + direction + galleryItems.length) % galleryItems.length
    );
  };

  const handleGalleryTouchStart = (event) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleGalleryTouchEnd = (event) => {
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
  };

  const handleOpenFullscreen = (event) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!onOpenFullscreen || galleryItems.length === 0) return;

    const activeItem = galleryItems[currentImageIndex];
    onOpenFullscreen(
      galleryItems,
      currentImageIndex,
      event.currentTarget.getBoundingClientRect(),
      activeItem.originKey
    );
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const activeImage = galleryItems[currentImageIndex] || null;
  const hasMultipleImages = galleryItems.length > 1;
  const hasDescription = Boolean(product.description?.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Просмотр товара"
      size="large"
      showCloseButton={false}
      className="product-detail"
    >
      <div className="feed-card-header product-detail-header">
        <div className="section-avatar" aria-hidden="true">🛍</div>
        <div className="section-meta">
          <span className="section-title-name">{product.title}</span>
          <button
            type="button"
            className="product-article"
            onClick={handleCopyArticle}
          >
            Артикул: #{product.id} <span aria-hidden="true">📋</span>
          </button>
          <div className="product-detail-stats" aria-label="Статистика товара">
            <span className="product-detail-stat">
              <span aria-hidden="true">👁</span>
              <span>{viewsCount}</span>
            </span>
            <span className="product-detail-stat">
              <svg
                className="product-detail-stat-heart"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{favoritesCount}</span>
            </span>
          </div>
        </div>
        <div className="post-card-actions" role="group" aria-label="Действия с товаром">
          {moderator && (
            <>
              <IconButton
                ariaLabel="Редактировать товар"
                variant="ghost"
                size="sm"
                className="edit-post-btn"
                onClick={onEdit}
              >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
                <path d="m13.7 6.1 4.2 4.2" />
              </svg>
              </IconButton>
              <IconButton
                ariaLabel="Удалить товар"
                variant="danger"
                size="sm"
                className="delete-post-btn"
                onClick={handleDelete}
              >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 7h16" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M6 7l1 13h10l1-13" />
                <path d="M9 7V4h6v3" />
              </svg>
              </IconButton>
            </>
          )}
          <IconButton
            ariaLabel="Закрыть карточку товара"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </IconButton>
        </div>
      </div>

      <div
        className="product-detail-gallery"
        onTouchStart={handleGalleryTouchStart}
        onTouchEnd={handleGalleryTouchEnd}
      >
        <button
          type="button"
          className="product-card-favorite-btn"
          onClick={handleFavoriteClick}
          aria-label={favorited ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          {favorited ? (
            <svg viewBox="0 0 24 24" fill="#ff3b30" stroke="#ff3b30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
        </button>

        {activeImage ? (
          <button
            type="button"
            className="product-detail-image-btn"
            onClick={handleOpenFullscreen}
            disabled={!onOpenFullscreen}
            aria-label="Открыть фото товара на весь экран"
            data-media-origin-key={activeImage.originKey}
          >
            {activeImage.isVideo ? (
              <video
                src={videoPreviewUrl(activeImage.url)}
                muted
                playsInline
                preload="metadata"
                aria-label={`Видео товара ${product.title || ''}`}
              />
            ) : (
              <img
                src={activeImage.url}
                alt={`Фото товара ${product.title || 'без названия'}`}
              />
            )}
          </button>
        ) : (
          <div className="product-detail-no-image">Нет фото</div>
        )}

        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="product-gallery-nav product-gallery-nav--prev"
              onClick={() => goToImage(-1)}
              aria-label="Предыдущее фото"
            >
              ‹
            </button>
            <button
              type="button"
              className="product-gallery-nav product-gallery-nav--next"
              onClick={() => goToImage(1)}
              aria-label="Следующее фото"
            >
              ›
            </button>
            <div className="product-gallery-dots" aria-label="Фото товара">
              {galleryItems.map((item, index) => (
                <button
                  key={item.filename}
                  type="button"
                  className={index === currentImageIndex ? 'is-active' : ''}
                  onClick={() => setCurrentImageIndex(index)}
                  aria-label={`Показать фото ${index + 1}`}
                  aria-current={index === currentImageIndex ? 'true' : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="product-detail-content">
        {hasDescription && <p className="product-description">{product.description}</p>}

        {selectedCategoryNames.length > 0 && (
          <div className="product-category-chips" aria-label="Категории товара">
            {selectedCategoryNames.map((name) => (
              <span key={name} className="product-category-chip">{name}</span>
            ))}
          </div>
        )}

        {product.sizes && <p className="product-detail-sizes"><strong>Размеры:</strong> {product.sizes}</p>}
        <ProductPrice
          price={product.price}
          oldPrice={product.old_price}
          className="product-price"
          currentClassName="product-price-current"
          oldClassName="product-price-old"
        />
        {product.out_of_stock && <p className="product-out-of-stock-text">Нет в наличии</p>}

        <BuyButton product={product} />
      </div>
    </Modal>
  );
}

export default ProductDetail;
