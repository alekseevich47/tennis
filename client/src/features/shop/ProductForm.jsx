import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';

const INITIAL = {
  title: '',
  description: '',
  price: '',
  sizes: '',
  images: /** @type {FileList | null} */ (null)
};

/**
 * @param {{
 *   isOpen: boolean,
 *   product?: any,
 *   onClose: () => void,
 *   onSubmit: (data: FormData) => Promise<void> | void
 * }} props
 */
function ProductForm({ isOpen, product, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    ...INITIAL,
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    sizes: product?.sizes || ''
  }));
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', form.title);
      data.append('description', form.description);
      data.append('price', String(parseFloat(form.price) || 0));
      data.append('sizes', form.sizes);
      if (form.images) {
        Array.from(form.images).forEach((img) => data.append('images', img));
      }
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Редактировать товар' : 'Новый товар'}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="product-title">Название</label>
          <input
            id="product-title"
            type="text"
            value={form.title}
            onChange={(e) => updateField('title')(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="product-description">Описание</label>
          <textarea
            id="product-description"
            rows={3}
            value={form.description}
            onChange={(e) => updateField('description')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="product-price">Цена, ₽</label>
          <input
            id="product-price"
            type="number"
            value={form.price}
            onChange={(e) => updateField('price')(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="product-sizes">Размеры</label>
          <input
            id="product-sizes"
            type="text"
            value={form.sizes}
            onChange={(e) => updateField('sizes')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="product-images">Фотографии</label>
          <input
            id="product-images"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => updateField('images')(e.target.files)}
          />
        </div>

        <button type="submit" className="submit-btn-full" disabled={submitting}>
          {submitting ? 'Сохраняем...' : 'Подтвердить'}
        </button>
      </form>
    </Modal>
  );
}

export default ProductForm;
