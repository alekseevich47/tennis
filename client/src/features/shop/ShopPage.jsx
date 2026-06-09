import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useProducts } from '../../hooks/useProducts';
import { isModerator } from '../../services/auth';
import { restoreProduct, softDeleteProduct } from '../../services/catalog';
import { useProductUpload } from '../../components/ProductUploadProvider';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';
import ProductDetail from './ProductDetail';
import CategoryDropdown from './CategoryDropdown';
import SearchBar from './SearchBar';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import { error } from '../../lib/log';
import './Shop.css';

const SCROLL_HIDE_DEBOUNCE_MS = 300;

/**
 * @param {{
 *   onDeletedIdsChange?: (ids: string[]) => void,
 *   productToOpen?: import('../../services/catalog').ProductRecord | null,
 *   onProductOpened?: () => void
 * }} props
 */
function ShopPage({ onDeletedIdsChange, productToOpen = null, onProductOpened } = {}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { data: products, isLoading, mutate } = useProducts({
    categoryId: selectedCategoryId || undefined
  });
  const moderator = isModerator();
  const { startUpload } = useProductUpload();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deletedProductIds, setDeletedProductIds] = useState([]);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [isButtonVisible, setIsButtonVisible] = useState(true);

  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    onDeletedIdsChange?.(deletedProductIds);
  }, [deletedProductIds, onDeletedIdsChange]);

  useEffect(() => {
    if (!productToOpen) return;
    setSelectedProduct(productToOpen);
    onProductOpened?.();
  }, [productToOpen, onProductOpened]);

  useEffect(() => {
    const container = containerRef.current;
    if (!moderator || !container) return undefined;

    const handleScroll = () => {
      setIsButtonVisible(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsButtonVisible(true);
      }, SCROLL_HIDE_DEBOUNCE_MS);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [moderator]);

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    const baseProducts = moderator ? products : products.filter(
      (product) => !product.is_deleted && !deletedProductIds.includes(product.id)
    );
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    if (!normalizedSearchQuery) return baseProducts;

    if (normalizedSearchQuery.startsWith('#')) {
      const idQuery = normalizedSearchQuery.slice(1);
      return baseProducts.filter((product) =>
        String(product.id || '').toLowerCase().includes(idQuery)
      );
    }

    return baseProducts.filter((product) =>
      String(product.title || '').toLowerCase().includes(normalizedSearchQuery)
    );
  }, [products, moderator, deletedProductIds, searchQuery]);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
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
      {moderator && (
        <div className="floating-btn-wrapper">
          <button
            type="button"
            className={clsx('floating-add-btn', isButtonVisible ? 'visible' : 'hidden')}
            onClick={() => setShowAddModal(true)}
          >
            Добавить
          </button>
        </div>
      )}

      <div className={clsx('shop-header-bar-new', isSearchOpen && 'search-open')}>
        <CategoryDropdown
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          isSearchOpen={isSearchOpen}
          onCloseSearch={handleCloseSearch}
        />
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isOpen={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          onSearchToggle={setIsSearchOpen}
        />
      </div>

      {isLoading ? (
        <Spinner label="Загрузка товаров..." />
      ) : visibleProducts.length === 0 ? (
        <EmptyState title="Нет товаров" description="Скоро здесь появятся первые позиции." />
      ) : (
        <div className="products-grid">
          {visibleProducts.map((product) => {
            const isSoftDeleted =
              deletedProductIds.includes(product.id) || product.is_deleted === true;
            return (
              <ProductCard
                key={product.id}
                product={product}
                isSoftDeleted={isSoftDeleted}
                moderator={moderator}
                hiddenMediaKey={hiddenMediaKey}
                onOpen={setSelectedProduct}
                onDelete={handleDelete}
                onRestore={handleRestore}
                onOpenFullscreen={handleOpenFullscreen}
              />
            );
          })}
        </div>
      )}

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
