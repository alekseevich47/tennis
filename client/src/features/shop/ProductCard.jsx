import React, { memo, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { useFavorites } from '../../context/FavoritesContext';
import { useProductCategories } from '../../hooks/useProductCategories';
import { getMediaThumbUrl, getMediaUrl, isVideoMediaName, mediaNames } from '../../lib/media';
import BuyButton from './BuyButton';
import ProductGallery from './ProductGallery';
import ProductPrice from './ProductPrice';
import {
  normalizeVariantMode,
  parseProductColors,
  parseProductParameters
} from './productParameters';
import { normalizeProductCategoryIds } from './productCategories';

/**
 * @param {{
 *   product: import('../../services/catalog').ProductRecord,
 *   isSoftDeleted?: boolean,
 *   moderator?: boolean,
 *   hiddenMediaKey?: string | null,
 *   onOpen: (product: any) => void,
 *   onDelete?: (productId: string) => void,
 *   onRestore?: (productId: string) => void,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
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
  const { isFavorite, addItem, removeItem } = useFavorites();
  const favorited = isFavorite(product.id);

  const galleryItems = useMemo(() => (
    mediaNames(product.images).flatMap((filename, index) => {
      const url = getMediaUrl(product, 'products', filename);
      const thumbUrl = getMediaThumbUrl(product, 'products', filename, '600x0');
      if (!url) return [];
      return [{
        filename,
        url,
        thumbUrl: thumbUrl || url,
        previewUrl: thumbUrl || url,
        isVideo: isVideoMediaName(filename),
        originKey: `product-card-${product.id}-${index}`
      }];
    })
  ), [product]);

  const categoryNames = useMemo(() => {
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

  const productColors = useMemo(() => parseProductColors(product?.colors), [product?.colors]);
  const variantMode = normalizeVariantMode(product?.variant_mode);

  const openProduct = useCallback(() => onOpen(product), [onOpen, product]);

  const handleOpenFullscreen = useCallback((event, index) => {
    if (!onOpenFullscreen || galleryItems.length === 0) {
      openProduct();
      return;
    }
    const activeItem = galleryItems[index];
    onOpenFullscreen(
      galleryItems,
      index,
      event.currentTarget.getBoundingClientRect(),
      activeItem.originKey
    );
  }, [galleryItems, onOpenFullscreen, openProduct]);

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

  const handleFavoriteClick = useCallback((event) => {
    event.stopPropagation();
    if (favorited) {
      removeItem(product.id);
    } else {
      addItem(product);
    }
  }, [favorited, addItem, removeItem, product]);

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
        {!isSoftDeleted && (
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
        )}

        <ProductGallery
          items={galleryItems}
          resetKey={product.id}
          variant="card"
          hiddenMediaKey={hiddenMediaKey}
          onOpenFullscreen={handleOpenFullscreen}
          onCenterClick={openProduct}
          imageAlt={`Фото товара ${product.title || 'без названия'}`}
        />
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
        {(categoryNames.length > 0 || variantMode === 'color' || variantMode === 'size') && (
          <div className="product-card-meta-row" aria-label="Категория и варианты">
            {categoryNames.slice(0, 1).map((name) => (
              <span key={name} className="product-category-chip">{name}</span>
            ))}
            {variantMode === 'color' && productColors.length > 0 && (
              <div className="product-card-color-dots" aria-label="Цвета">
                {productColors.map((color) => (
                  <span
                    key={color}
                    className="product-color-dot product-color-dot--filled"
                    style={{ background: color, borderColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
            {variantMode === 'size' && product.sizes && (
              <span className="product-card-sizes-badge">{product.sizes}</span>
            )}
          </div>
        )}
        <ProductPrice
          price={product.price}
          oldPrice={product.old_price}
          className="price"
          currentClassName="product-price-current"
          oldClassName="product-price-old"
        />
        {product.out_of_stock && (
          <span className="product-out-of-stock-badge">Нет в наличии</span>
        )}
      </div>

      {!isSoftDeleted && (
        <BuyButton product={product} />
      )}

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
