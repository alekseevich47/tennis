import React, { useCallback, useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { isModerator } from '../../services/auth';
import {
  createProduct,
  updateProduct,
  deleteProduct
} from '../../services/catalog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';
import ProductDetail from './ProductDetail';
import { error } from '../../lib/log';
import './Shop.css';

function ShopPage() {
  const { data: products, isLoading, mutate } = useProducts();
  const moderator = isModerator();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleCreate = useCallback(
    async (data) => {
      try {
        await createProduct(data);
        setShowAddModal(false);
        mutate();
      } catch (err) {
        error('create product:', err);
      }
    },
    [mutate]
  );

  const handleEdit = useCallback(
    async (data) => {
      if (!selectedProduct) return;
      try {
        await updateProduct(selectedProduct.id, data);
        setShowEditModal(false);
        setSelectedProduct(null);
        mutate();
      } catch (err) {
        error('update product:', err);
      }
    },
    [selectedProduct, mutate]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedProduct) return;
    try {
      await deleteProduct(selectedProduct.id);
      setSelectedProduct(null);
      mutate();
    } catch (err) {
      error('delete product:', err);
    }
  }, [selectedProduct, mutate]);

  return (
    <section className="shop" aria-label="Магазин секции">
      <div className="shop-header-bar">
        {moderator && (
          <button
            type="button"
            className="shop-add-btn"
            onClick={() => setShowAddModal(true)}
            aria-label="Добавить товар"
          >
            <span aria-hidden="true">+</span> Новый товар
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner label="Загрузка товаров..." />
      ) : !products || products.length === 0 ? (
        <EmptyState title="Нет товаров" description="Скоро здесь появятся первые позиции." />
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={setSelectedProduct}
            />
          ))}
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
        onDelete={handleDelete}
      />

      <ProductForm
        isOpen={showEditModal}
        product={selectedProduct}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEdit}
      />
    </section>
  );
}

export default ShopPage;
