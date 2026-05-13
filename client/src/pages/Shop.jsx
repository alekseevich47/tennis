import React, { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, getCurrentUser, isModerator } from '../services/pocketbase';
import './Shop.css';

/**
 * Компонент магазина экипировки
 * Отображает товары в сетке 2x2 с возможностью просмотра деталей
 */
function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const moderator = isModerator();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shop">
      <header className="shop-header">
        <h1>Магазин</h1>
        {moderator && (
          <button className="add-btn" onClick={() => setShowAddModal(true)}>+</button>
        )}
      </header>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : products.length === 0 ? (
        <div className="empty">Нет товаров</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card" onClick={() => setSelectedProduct(product)}>
              <div className="product-image">
                {product.images && product.images[0] ? (
                  <img src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${product.collectionId}/${product.id}/${product.images[0]}`} alt={product.title} />
                ) : (
                  <div className="no-image">Нет фото</div>
                )}
              </div>
              <div className="product-info">
                <h3>{product.title}</h3>
                <p className="price">{product.price} ₽</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <ProductForm 
          onClose={() => setShowAddModal(false)} 
          onSubmit={async (data) => {
            await createProduct(data);
            setShowAddModal(false);
            loadProducts();
          }} 
        />
      )}

      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onEdit={() => { setSelectedProduct(null); setShowEditModal(true); }}
          onDelete={async () => {
            if (confirm('Вы уверены?')) {
              await deleteProduct(selectedProduct.id);
              setSelectedProduct(null);
              loadProducts();
            }
          }}
          moderator={moderator}
        />
      )}

      {showEditModal && selectedProduct && (
        <ProductForm 
          product={selectedProduct}
          onClose={() => setShowEditModal(false)} 
          onSubmit={async (data) => {
            await updateProduct(selectedProduct.id, data);
            setShowEditModal(false);
            loadProducts();
          }} 
        />
      )}
    </div>
  );
}

/**
 * Форма создания/редактирования товара
 */
function ProductForm({ product, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || '',
    sizes: product?.sizes || '',
    images: null
  });

  const handleSubmit = () => {
    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('price', parseFloat(formData.price));
    data.append('sizes', formData.sizes);
    if (formData.images) {
      for (let img of formData.images) {
        data.append('images', img);
      }
    }
    onSubmit(data);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Редактировать товар' : 'Новый товар'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <input type="text" placeholder="Название" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        <textarea placeholder="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
        <input type="number" placeholder="Цена" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
        <input type="text" placeholder="Размеры" value={formData.sizes} onChange={e => setFormData({...formData, sizes: e.target.value})} />
        <input type="file" multiple accept="image/*" onChange={e => setFormData({...formData, images: e.target.files})} />
        <button className="submit-btn" onClick={handleSubmit}>Подтвердить</button>
      </div>
    </div>
  );
}

/**
 * Детальная информация о товаре
 */
function ProductDetail({ product, onClose, onEdit, onDelete, moderator }) {
  const pbUrl = import.meta.env.VITE_POCKETBASE_URL;
  
  const copyArticle = () => {
    navigator.clipboard.writeText(`#${product.id}`);
    alert('Артикул скопирован');
  };

  const contactModerator = () => {
    // Здесь должна быть логика перехода в чат с модератором
    alert('Переход в чат с модератором для покупки');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal product-detail" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product.title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="product-images">
          {product.images?.map((img, i) => (
            <img key={i} src={`${pbUrl}/api/files/${product.collectionId}/${product.id}/${img}`} alt={product.title} />
          ))}
        </div>

        <div className="product-article" onClick={copyArticle}>
          Артикул: #{product.id} 📋
        </div>

        <p className="product-description">{product.description}</p>
        <p><strong>Размеры:</strong> {product.sizes}</p>
        <p className="product-price">{product.price} ₽</p>

        <button className="buy-btn" onClick={contactModerator}>Купить</button>

        {moderator && (
          <div className="moderator-actions">
            <button className="edit-btn" onClick={onEdit}>Редактировать</button>
            <button className="delete-btn" onClick={onDelete}>Удалить</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Shop;
