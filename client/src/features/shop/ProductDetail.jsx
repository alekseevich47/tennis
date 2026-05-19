import React from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { getMediaUrl } from '../../lib/media';

/**
 * @param {{
 *   isOpen: boolean,
 *   product: any | null,
 *   moderator: boolean,
 *   onClose: () => void,
 *   onEdit: () => void,
 *   onDelete: () => Promise<void> | void
 * }} props
 */
function ProductDetail({ isOpen, product, moderator, onClose, onEdit, onDelete }) {
  const { alert, confirm } = useAlertDialog();
  if (!product) return null;

  const handleCopyArticle = async () => {
    try {
      await navigator.clipboard.writeText(`#${product.id}`);
      await alert({ title: 'Скопировано', message: 'Артикул скопирован в буфер обмена.' });
    } catch {
      await alert({ title: 'Не получилось', message: 'Скопируйте артикул вручную.' });
    }
  };

  const handleContact = async () => {
    await alert({
      title: 'Связь с модератором',
      message: 'Напишите модератору секции в MAX для покупки этого товара.'
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Удалить товар?',
      message: 'Это действие нельзя отменить.',
      confirmText: 'Удалить'
    });
    if (!ok) return;
    await onDelete();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product.title} className="product-detail">
      <div className="product-images">
        {product.images?.map((img) => {
          const url = getMediaUrl(product, 'products', img);
          return url ? (
            <img
              key={img}
              src={url}
              alt={`Фото товара ${product.title}`}
            />
          ) : null;
        })}
      </div>

      <button
        type="button"
        className="product-article"
        onClick={handleCopyArticle}
      >
        Артикул: #{product.id} <span aria-hidden="true">📋</span>
      </button>

      <p className="product-description">{product.description}</p>
      {product.sizes && <p><strong>Размеры:</strong> {product.sizes}</p>}
      <p className="product-price">{product.price} ₽</p>

      <button type="button" className="buy-btn" onClick={handleContact}>
        Купить
      </button>

      {moderator && (
        <div className="moderator-actions">
          <button type="button" className="edit-btn" onClick={onEdit}>
            Редактировать
          </button>
          <button type="button" className="delete-btn" onClick={handleDelete}>
            Удалить
          </button>
        </div>
      )}
    </Modal>
  );
}

export default ProductDetail;
