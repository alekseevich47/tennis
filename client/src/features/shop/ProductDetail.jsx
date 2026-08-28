import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useFavorites } from '../../context/FavoritesContext';
import { useProductCategories } from '../../hooks/useProductCategories';
import PostContentHtml from '../feed/PostContentHtml';
import BuyButton from './BuyButton';
import ProductGallery from './ProductGallery';
import ProductPrice from './ProductPrice';
import {
  normalizeVariantMode,
  parseProductColors,
  parseProductParameters
} from './productParameters';
import { getMediaThumbUrl, getMediaUrl, isVideoMediaName, mediaNames } from '../../lib/media';
import { useKeepForModalClose } from '../../hooks/useKeepForModalClose';
import { normalizeProductCategoryIds } from './productCategories';

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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

  const productColors = useMemo(() => parseProductColors(product?.colors), [product?.colors]);
  const productParameters = useMemo(
    () => parseProductParameters(product?.parameters),
    [product?.parameters]
  );
  const variantMode = normalizeVariantMode(product?.variant_mode);
  const hasDescription = Boolean(product?.description?.trim());

  useEffect(() => {
    if (!isOpen) return;
    setCurrentImageIndex(0);
    setDescriptionExpanded(false);
  }, [isOpen, product?.id]);

  useEffect(() => {
    setViewsCount(Number(product?.views) || 0);
    setFavoritesCount(Math.max(0, Number(product?.favorites_count) || 0));
  }, [product?.id, product?.views, product?.favorites_count]);

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

  const handleOpenFullscreen = (event, index) => {
    if (!onOpenFullscreen || galleryItems.length === 0) return;
    const activeItem = galleryItems[index];
    onOpenFullscreen(
      galleryItems,
      index,
      event.currentTarget.getBoundingClientRect(),
      activeItem.originKey
    );
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Просмотр товара"
      size="large"
      showCloseButton={false}
      className="product-detail"
      footer={(
        <div className="product-detail-footer">
          <ProductPrice
            price={product.price}
            oldPrice={product.old_price}
            className="product-price"
            currentClassName="product-price-current"
            oldClassName="product-price-old"
          />
          {product.out_of_stock && (
            <p className="product-out-of-stock-text">Нет в наличии</p>
          )}
          <BuyButton product={product} />
        </div>
      )}
    >
      <div className="product-detail-scroll">
        <div className="feed-card-header product-detail-header">
          <div className="section-meta product-detail-meta">
            <span className="section-title-name">{product.title}</span>
            <button
              type="button"
              className="product-article"
              onClick={handleCopyArticle}
            >
              <span>Артикул: #{product.id}</span>
              <span className="product-article-copy" aria-hidden="true">
                <CopyIcon />
              </span>
            </button>
            <div className="product-detail-stats" aria-label="Статистика товара">
              <span className="product-detail-stat">
                <EyeIcon />
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

        <div className="product-detail-gallery">
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

          <ProductGallery
            items={galleryItems}
            resetKey={product.id}
            index={currentImageIndex}
            onIndexChange={setCurrentImageIndex}
            variant="detail"
            onOpenFullscreen={onOpenFullscreen ? handleOpenFullscreen : undefined}
            imageAlt={`Фото товара ${product.title || 'без названия'}`}
          />
        </div>

        {(selectedCategoryNames.length > 0 || variantMode === 'color' || variantMode === 'size') && (
          <div className="product-detail-badges" aria-label="Категория и варианты">
            {selectedCategoryNames.map((name) => (
              <span key={name} className="product-category-chip">{name}</span>
            ))}
            {variantMode === 'color' && productColors.length > 0 && (
              <div className="product-detail-color-dots" aria-label="Цвета">
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
              <span className="product-detail-sizes-badge">{product.sizes}</span>
            )}
          </div>
        )}

        {productParameters.length > 0 && (
          <ul className="product-detail-params">
            {productParameters.map((item) => (
              <li key={`${item.name}-${item.value}`} className="product-detail-params__row">
                <span className="product-detail-params__name">{item.name}:</span>
                <span className="product-detail-params__value">{item.value}</span>
              </li>
            ))}
          </ul>
        )}

        {hasDescription && (
          <div className="product-detail-description-block">
            <button
              type="button"
              className={descriptionExpanded ? 'product-detail-more-link is-expanded' : 'product-detail-more-link'}
              onClick={() => setDescriptionExpanded((value) => !value)}
              aria-expanded={descriptionExpanded}
            >
              <span>Ещё характеристики</span>
              <span className="product-detail-more-chevron" aria-hidden="true">›</span>
            </button>
            {descriptionExpanded && (
              <PostContentHtml
                content={product.description}
                className="product-description"
                as="div"
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ProductDetail;
