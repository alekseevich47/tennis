import React, { useState, useEffect } from 'react';
import { getGallery, addToGallery, deleteFromGallery, isModerator } from '../services/pocketbase';
import './Gallery.css';

/**
 * Компонент галереи фотографий
 * Отображает фотографии в сетке 2x2 с просмотром в полном размере
 */
function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const moderator = isModerator();

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await getGallery();
      setImages(data);
    } catch (error) {
      console.error('Ошибка загрузки галереи:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      await addToGallery(formData);
      setShowAddModal(false);
      loadGallery();
    } catch (error) {
      alert('Не удалось добавить фото');
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm('Удалить фото?')) return;
    try {
      await deleteFromGallery(imageId);
      loadGallery();
      setSelectedImage(null);
    } catch (error) {
      alert('Не удалось удалить');
    }
  };

  return (
    <div className="gallery">
      <header className="gallery-header">
        <h1>Галерея</h1>
        {moderator && (
          <button className="add-btn" onClick={() => setShowAddModal(true)}>+</button>
        )}
      </header>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : images.length === 0 ? (
        <div className="empty">Нет фотографий</div>
      ) : (
        <div className="gallery-grid">
          {images.map(img => (
            <div 
              key={img.id} 
              className="gallery-item"
              onClick={() => setSelectedImage(img)}
            >
              <img 
                src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${img.collectionId}/${img.id}/${img.image}`} 
                alt="Gallery" 
              />
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить фото</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <input type="file" accept="image/*" id="gallery-upload" />
            <button className="submit-btn" onClick={() => {
              const file = document.getElementById('gallery-upload').files[0];
              if (file) handleAddImage(file);
            }}>Загрузить</button>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fullscreen-image" onClick={() => setSelectedImage(null)}>
          <button className="close-fullscreen" onClick={() => setSelectedImage(null)}>✕</button>
          <img 
            src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${selectedImage.collectionId}/${selectedImage.id}/${selectedImage.image}`} 
            alt="Full size" 
          />
          {moderator && (
            <button className="delete-photo" onClick={(e) => { e.stopPropagation(); handleDelete(selectedImage.id); }}>
              Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Gallery;
