import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useProducts } from '../../hooks/useProducts';
import { useProductCategories } from '../../hooks/useProductCategories';
import { isModerator } from '../../services/auth';
import { softDeleteProduct, updateProduct } from '../../services/catalog';
import { useProductUpload } from '../../components/ProductUploadProvider';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';
import ProductDetail from './ProductDetail';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import { error } from '../../lib/log';
import './Shop.css';

const SCROLL_HIDE_DEBOUNCE_MS = 300;

function ShopPage() {
  const categoryButtonId = useId();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { data: products, isLoading, mutate } = useProducts({
    categoryId: selectedCategoryId || undefined
  });
  const { data: categories = [] } = useProductCategories();
  const moderator = isModerator();
  const { startUpload } = useProductUpload();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [deletedProductIds, setDeletedProductIds] = useState([]);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [isButtonVisible, setIsButtonVisible] = useState(true);

  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

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

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return 'Все категории';
    return categories.find((category) => category.id === selectedCategoryId)?.name || 'Категория';
  }, [categories, selectedCategoryId]);

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
      await updateProduct(productId, { is_deleted: false });
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

  const handleToggleSearch = useCallback(() => {
    if (isSearchOpen) {
      setSearchQuery('');
    }
    setIsSearchOpen((value) => !value);
  }, [isSearchOpen]);

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

      <div className="shop-header-bar">
        <div className="shop-category-filter">
          <button
            id={categoryButtonId}
            type="button"
            className="product-category-trigger"
            onClick={() => setIsCategoryMenuOpen((value) => !value)}
            aria-haspopup="listbox"
            aria-expanded={isCategoryMenuOpen}
          >
            {selectedCategoryName}
          </button>
          {isCategoryMenuOpen && (
            <div
              className="product-category-menu"
              role="listbox"
              aria-labelledby={categoryButtonId}
            >
              <button
                type="button"
                className="product-category-option"
                role="option"
                aria-selected={!selectedCategoryId}
                onClick={() => {
                  setSelectedCategoryId('');
                  setIsCategoryMenuOpen(false);
                }}
              >
                Все категории
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="product-category-option"
                  role="option"
                  aria-selected={selectedCategoryId === category.id}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setIsCategoryMenuOpen(false);
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="shop-search-btn"
          onClick={handleToggleSearch}
          aria-label={isSearchOpen ? 'Скрыть поиск товаров' : 'Показать поиск товаров'}
          aria-controls="shop-search-input"
          aria-expanded={isSearchOpen}
        >
          <span aria-hidden="true">🔍</span>
        </button>

        {isSearchOpen && (
          <input
            id="shop-search-input"
            className="shop-search-input"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по названию или #артикулу"
            autoFocus
          />
        )}
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
