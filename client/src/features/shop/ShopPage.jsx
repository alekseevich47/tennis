import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useProducts } from '../../hooks/useProducts';
import { isModerator } from '../../services/auth';
import { incrementProductViews, restoreProduct, softDeleteProduct } from '../../services/catalog';
import { useProductUpload } from '../../components/ProductUploadProvider';
import EmptyState from '../../components/ui/EmptyState';
import PullToRefresh from '../../components/ui/PullToRefresh';
import { ShopGridSkeleton } from '../../components/ui/Skeleton';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';
import ProductDetail from './ProductDetail';
import CategoryDropdown from './CategoryDropdown';
import SearchBar from './SearchBar';
import ShopFilterButton from './ShopFilterButton';
import ShopFiltersSheet from './ShopFiltersSheet';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import { useSectionScroll } from '../../hooks/useSectionScroll';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import { useRegisterAddAction } from '../../context/AddActionContext';
import { error } from '../../lib/log';
import {
  countActiveShopFilters,
  DEFAULT_SHOP_FILTERS,
  getPriceBounds,
  productMatchesFilters,
  sortProducts
} from './shopFilters';
import './Shop.css';

/**
 * @param {{
 *   onDeletedIdsChange?: (ids: string[]) => void,
 *   productToOpen?: import('../../services/catalog').ProductRecord | null,
 *   onProductOpened?: () => void
 * }} props
 */
function ShopPage({ onDeletedIdsChange, productToOpen = null, onProductOpened } = {}) {
  const [filters, setFilters] = useState(DEFAULT_SHOP_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { data: products, isLoading, mutate } = useProducts();
  const moderator = isModerator();
  const { startUpload } = useProductUpload();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deletedProductIds, setDeletedProductIds] = useState([]);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loadMediaUntilIndex, setLoadMediaUntilIndex] = useState(7);

  const containerRef = useRef(null);
  const cardObserverRef = useRef(/** @type {IntersectionObserver | null} */ (null));
  const isSearchOpenRef = useRef(isSearchOpen);
  const searchQueryRef = useRef(searchQuery);

  useSectionScroll(containerRef);
  useOverlayClose(isSearchOpen, () => setIsSearchOpen(false), 'shop-search');
  useRegisterAddAction(() => setShowAddModal(true), moderator);

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    isSearchOpenRef.current = isSearchOpen;
  }, [isSearchOpen]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    onDeletedIdsChange?.(deletedProductIds);
  }, [deletedProductIds, onDeletedIdsChange]);

  const openProduct = useCallback((product) => {
    if (!product?.id) return;
    const nextViews = (Number(product.views) || 0) + 1;
    const nextProduct = { ...product, views: nextViews };
    setSelectedProduct(nextProduct);
    mutate(
      (curr = []) => curr.map((item) => (
        item.id === product.id ? { ...item, views: nextViews } : item
      )),
      false
    );
    incrementProductViews(product.id).catch((err) => {
      error('increment product views:', err);
    });
  }, [mutate]);

  useEffect(() => {
    if (!productToOpen) return;
    openProduct(productToOpen);
    onProductOpened?.();
  }, [productToOpen, onProductOpened, openProduct]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleScroll = () => {
      if (isSearchOpenRef.current && !searchQueryRef.current.trim()) {
        setIsSearchOpen(false);
        setIsSearchFocused(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const baseProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(
      (product) => !product.is_deleted || deletedProductIds.includes(product.id)
    );
  }, [products, deletedProductIds]);

  const priceBounds = useMemo(() => getPriceBounds(baseProducts), [baseProducts]);

  const activeFilterCount = useMemo(
    () => countActiveShopFilters(filters, priceBounds),
    [filters, priceBounds]
  );

  const categoryProductCount = useMemo(() => {
    if (!filters.categoryId) return null;
    return baseProducts.filter((product) => {
      if (product.is_deleted && !deletedProductIds.includes(product.id)) return false;
      return productMatchesFilters(
        product,
        { ...DEFAULT_SHOP_FILTERS, categoryId: filters.categoryId },
        priceBounds
      );
    }).length;
  }, [baseProducts, deletedProductIds, filters.categoryId, priceBounds]);

  const visibleProducts = useMemo(() => {
    const filtered = baseProducts.filter((product) =>
      productMatchesFilters(product, filters, priceBounds)
    );

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const searched = !normalizedSearchQuery
      ? filtered
      : normalizedSearchQuery.startsWith('#')
        ? filtered.filter((product) =>
            String(product.id || '').toLowerCase().includes(normalizedSearchQuery.slice(1))
          )
        : filtered.filter((product) => {
            const title = String(product.title || '').toLowerCase();
            const description = String(product.description || '').toLowerCase();
            return (
              title.includes(normalizedSearchQuery)
              || description.includes(normalizedSearchQuery)
            );
          });

    return sortProducts(searched, filters);
  }, [baseProducts, filters, priceBounds, searchQuery]);

  useEffect(() => {
    cardObserverRef.current?.disconnect();
    cardObserverRef.current = new IntersectionObserver(
      (entries) => {
        let maxVisible = -1;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(/** @type {HTMLElement} */ (entry.target).dataset.productIndex);
          if (!Number.isNaN(idx)) maxVisible = Math.max(maxVisible, idx);
        });
        if (maxVisible >= 0) {
          setLoadMediaUntilIndex((prev) => Math.max(prev, maxVisible + 6));
        }
      },
      { root: containerRef.current, rootMargin: '120px 0px', threshold: 0.05 }
    );
    return () => cardObserverRef.current?.disconnect();
  }, [visibleProducts.length]);

  const registerProductCard = useCallback((node) => {
    const observer = cardObserverRef.current;
    if (!observer) return;
    if (node) observer.observe(node);
  }, []);

  const handleCloseSearchUI = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleCategoryChange = useCallback((categoryId) => {
    setFilters((prev) => ({ ...prev, categoryId: categoryId || '' }));
  }, []);

  const handleApplyFilters = useCallback((next) => {
    setFilters(next);
  }, []);

  const handleCreate = useCallback(
    (data) => {
      setShowAddModal(false);
      startUpload(data);
    },
    [startUpload]
  );

  const handleEdit = useCallback(
    (data) => {
      if (!selectedProduct) return;
      setShowEditModal(false);
      setSelectedProduct(null);
      startUpload(data, selectedProduct.id);
    },
    [selectedProduct, startUpload]
  );

  const handleDelete = useCallback(async (productId) => {
    if (!productId) return;
    setDeletedProductIds((prev) =>
      prev.includes(productId) ? prev : [...prev, productId]
    );
    try {
      await softDeleteProduct(productId);
      mutate(
        (curr = []) =>
          curr.map((product) =>
            product.id === productId ? { ...product, is_deleted: true } : product
          ),
        false
      );
    } catch (err) {
      error('soft delete product:', err);
    }
  }, [mutate]);

  const handleRestore = useCallback(async (productId) => {
    setDeletedProductIds((prev) => prev.filter((id) => id !== productId));
    try {
      await restoreProduct(productId);
      mutate(
        (curr = []) =>
          curr.map((product) =>
            product.id === productId ? { ...product, is_deleted: false } : product
          ),
        false
      );
    } catch (err) {
      error('restore product:', err);
    }
  }, [mutate]);

  const handleOpenFullscreen = useCallback((items, index = 0, originRect = null, originKey = null) => {
    setHiddenMediaKey(null);
    setFullscreenMedia({ items, index, originRect, originKey });
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenMedia(null);
    setHiddenMediaKey(null);
  }, []);

  const handleFullscreenCloseStart = useCallback((originKey) => {
    setHiddenMediaKey(originKey || null);
  }, []);

  return (
    <section className="shop" ref={containerRef} aria-label="Магазин секции">
      <PullToRefresh
        scrollRef={containerRef}
        onRefresh={handleRefresh}
        header={(
          <div className={clsx('shop-header-bar-new', isSearchOpen && 'search-open')}>
            <CategoryDropdown
              selectedCategoryId={filters.categoryId}
              onCategoryChange={handleCategoryChange}
              productCount={categoryProductCount}
              isSearchOpen={isSearchOpen}
              onCloseSearch={handleCloseSearchUI}
              onOpenChange={setIsCategoryDropdownOpen}
            />
            <div className="shop-header-actions">
              <ShopFilterButton
                activeCount={activeFilterCount}
                onClick={() => {
                  if (isSearchOpen && !searchQuery.trim()) {
                    setIsSearchOpen(false);
                  }
                  setIsFiltersOpen(true);
                }}
              />
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isOpen={isSearchOpen}
                onOpenChange={setIsSearchOpen}
                onSearchToggle={setIsSearchOpen}
                onFocusChange={setIsSearchFocused}
              />
            </div>
          </div>
        )}
      >
        {isLoading ? (
          <div className="shop-skeleton-wrap">
            <ShopGridSkeleton />
          </div>
        ) : visibleProducts.length === 0 ? (
          <EmptyState title="Нет товаров" description="Скоро здесь появятся первые позиции." />
        ) : (
          <div className="products-grid">
            {visibleProducts.map((product, productIndex) => {
              const isSoftDeleted =
                deletedProductIds.includes(product.id) || product.is_deleted === true;
              return (
                <ProductCard
                  key={product.id}
                  ref={registerProductCard}
                  data-product-index={productIndex}
                  product={product}
                  isSoftDeleted={isSoftDeleted}
                  moderator={moderator}
                  hiddenMediaKey={hiddenMediaKey}
                  mediaEnabled={productIndex <= loadMediaUntilIndex}
                  onOpen={openProduct}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              );
            })}
          </div>
        )}
      </PullToRefresh>

      <ProductForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreate}
      />

      <ProductDetail
        isOpen={Boolean(selectedProduct) && !showEditModal}
        product={selectedProduct}
        moderator={moderator}
        onClose={() => setSelectedProduct(null)}
        onEdit={() => setShowEditModal(true)}
        onDelete={() => handleDelete(selectedProduct?.id)}
        onOpenFullscreen={handleOpenFullscreen}
      />

      <ProductForm
        isOpen={showEditModal}
        product={selectedProduct}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEdit}
      />

      <ShopFiltersSheet
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
        products={baseProducts.filter((p) => !p.is_deleted)}
      />

      {fullscreenMedia && (
        <FullscreenImageViewer
          items={fullscreenMedia.items}
          initialIndex={fullscreenMedia.index}
          originRect={fullscreenMedia.originRect}
          originKey={fullscreenMedia.originKey}
          onCloseStart={handleFullscreenCloseStart}
          onClose={handleCloseFullscreen}
        />
      )}
    </section>
  );
}

export default ShopPage;
