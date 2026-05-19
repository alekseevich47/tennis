import React, { useCallback, useState } from 'react';
import { useGallery } from '../../hooks/useGallery';
import { isModerator } from '../../services/auth';
import { addGalleryImage, deleteGalleryImage } from '../../services/catalog';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import IconButton from '../../components/ui/IconButton';
import AddImageModal from './AddImageModal';
import { getMediaUrl } from '../../lib/media';
import { error } from '../../lib/log';
import './Gallery.css';

function GalleryPage() {
  const moderator = isModerator();
  const { data: images, isLoading, mutate } = useGallery();
  const { alert, confirm } = useAlertDialog();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleAdd = useCallback(
    async (file) => {
      try {
        await addGalleryImage(file);
        setShowAddModal(false);
        mutate();
      } catch (err) {
        error('add gallery image:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось добавить фото.' });
      }
    },
    [mutate, alert]
  );

  const handleDelete = useCallback(
    async (imageId) => {
      const ok = await confirm({
        title: 'Удалить фото?',
        message: 'Это действие нельзя отменить.',
        confirmText: 'Удалить'
      });
      if (!ok) return;
      try {
        await deleteGalleryImage(imageId);
        setSelectedImage(null);
        mutate();
      } catch (err) {
        error('delete gallery image:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось удалить фото.' });
      }
    },
    [mutate, alert, confirm]
  );

  const selectedUrl = selectedImage
    ? getMediaUrl(selectedImage, 'gallery', selectedImage.image)
    : null;

  return (
    <section className="gallery" aria-label="Галерея фотографий">
      <div className="gallery-action-bar">
        {moderator && (
          <button
            type="button"
            className="gallery-add-btn"
            onClick={() => setShowAddModal(true)}
            aria-label="Добавить фото в галерею"
          >
            <span aria-hidden="true">+</span> Новое фото
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner label="Загрузка галереи..." />
      ) : !images || images.length === 0 ? (
        <EmptyState title="Нет фотографий" description="Загрузите первое фото секции." />
      ) : (
        <div className="gallery-grid">
          {images.map((img) => {
            const url = getMediaUrl(img, 'gallery', img.image);
            if (!url) return null;
            return (
              <button
                key={img.id}
                type="button"
                className="gallery-item"
                onClick={() => setSelectedImage(img)}
                aria-label="Открыть фото на весь экран"
              >
                <img src={url} alt="Фотография из галереи секции" />
              </button>
            );
          })}
        </div>
      )}

      <AddImageModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
      />

      {selectedImage && selectedUrl && (
        <div
          className="fullscreen-image"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фотографии"
          onClick={() => setSelectedImage(null)}
        >
          <IconButton
            ariaLabel="Закрыть просмотр"
            variant="ghost"
            size="lg"
            className="close-fullscreen"
            onClick={() => setSelectedImage(null)}
          >
            <span aria-hidden="true">✕</span>
          </IconButton>
          <img src={selectedUrl} alt="Полноразмерное фото из галереи" />
          {moderator && (
            <button
              type="button"
              className="delete-photo"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(selectedImage.id);
              }}
            >
              Удалить
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default GalleryPage;
