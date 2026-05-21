import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import MediaPreviewGrid from '../feed/MediaPreviewGrid';
import { useProductCategories } from '../../hooks/useProductCategories';
import {
  getMediaUrl,
  isVideoFile,
  isVideoMediaName,
  mediaNames,
  readSelectedFiles
} from '../../lib/media';

const INITIAL = {
  title: '',
  description: '',
  price: '',
  sizes: '',
  categories: /** @type {string[]} */ ([]),
  out_of_stock: false
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
  const fileInputId = useId();
  const categoryButtonId = useId();
  const { data: categories = [] } = useProductCategories();
  const [form, setForm] = useState(() => ({
    ...INITIAL,
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    sizes: product?.sizes || '',
    categories: Array.isArray(product?.categories) ? product.categories : [],
    out_of_stock: Boolean(product?.out_of_stock)
  }));
  const [imageFiles, setImageFiles] = useState(/** @type {File[]} */ ([]));
  const [imagesToDelete, setImagesToDelete] = useState(/** @type {string[]} */ ([]));
  const [newPreviewItems, setNewPreviewItems] = useState([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const existingImageNames = useMemo(() => mediaNames(product?.images), [product?.images]);
  const keptExistingImageNames = useMemo(
    () => existingImageNames.filter((filename) => !imagesToDelete.includes(filename)),
    [existingImageNames, imagesToDelete]
  );
  const existingPreviewItems = useMemo(
    () =>
      product
        ? keptExistingImageNames.flatMap((filename) => {
          const url = getMediaUrl(product, 'products', filename);
          return url
            ? [{
              key: `existing-${filename}`,
              url,
              name: filename,
              isVideo: isVideoMediaName(filename)
            }]
            : [];
        })
        : [],
    [product, keptExistingImageNames]
  );
  const previewItems = useMemo(
    () => [...existingPreviewItems, ...newPreviewItems],
    [existingPreviewItems, newPreviewItems]
  );
  const categoryLabel = useMemo(() => {
    if (form.categories.length === 0) return 'Категории не выбраны';
    const selectedNames = categories
      .filter((category) => form.categories.includes(category.id))
      .map((category) => category.name);

    return selectedNames.length > 0
      ? selectedNames.join(', ')
      : `Выбрано: ${form.categories.length}`;
  }, [categories, form.categories]);

  useEffect(() => {
    const items = imageFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isVideo: isVideoFile(file)
    }));
    setNewPreviewItems(items);
    return () => items.forEach((item) => URL.revokeObjectURL(item.url));
  }, [imageFiles]);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...INITIAL,
      title: product?.title || '',
      description: product?.description || '',
      price: product?.price?.toString() || '',
      sizes: product?.sizes || '',
      categories: Array.isArray(product?.categories) ? product.categories : [],
      out_of_stock: Boolean(product?.out_of_stock)
    });
    setImageFiles([]);
    setImagesToDelete([]);
    setIsCategoryMenuOpen(false);
  }, [isOpen, product]);

  const updateField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (categoryId) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', form.title.trim());
    data.append('description', form.description.trim());
    data.append('price', String(parseFloat(form.price) || 0));
    data.append('sizes', form.sizes.trim());
    data.append('out_of_stock', String(form.out_of_stock));
    imagesToDelete.forEach((filename) => data.append('images-', filename));
    imageFiles.forEach((img) => data.append('images', img));
    form.categories.forEach((categoryId) => data.append('categories', categoryId));
    onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Редактировать товар' : 'Новый товар'}
    >
      <form onSubmit={handleSubmit} className="product-form">
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
          <span className="product-form-label">Категории</span>
          <div className="product-category-multiselect">
            <button
              id={categoryButtonId}
              type="button"
              className="product-category-trigger"
              onClick={() => setIsCategoryMenuOpen((value) => !value)}
              aria-haspopup="listbox"
              aria-expanded={isCategoryMenuOpen}
            >
              {categoryLabel}
            </button>
            {isCategoryMenuOpen && (
              <div
                className="product-category-menu"
                role="listbox"
                aria-labelledby={categoryButtonId}
              >
                {categories.length === 0 ? (
                  <p className="product-category-empty">Категории не найдены</p>
                ) : (
                  categories.map((category) => (
                    <label key={category.id} className="product-category-option">
                      <input
                        type="checkbox"
                        checked={form.categories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <label className="product-stock-toggle">
          <input
            type="checkbox"
            checked={form.out_of_stock}
            onChange={(e) => updateField('out_of_stock')(e.target.checked)}
          />
          <span>Нет в наличии</span>
        </label>

        <MediaPreviewGrid
          items={previewItems}
          className="product-form-preview-grid"
          getAction={(item) => (
            <button
              type="button"
              className="media-remove-btn"
              onClick={() => {
                if (item.key.startsWith('existing-')) {
                  const filename = item.key.slice('existing-'.length);
                  setImagesToDelete((current) =>
                    current.includes(filename) ? current : [...current, filename]
                  );
                  return;
                }
                setImageFiles((current) =>
                  current.filter((file) => `${file.name}-${file.lastModified}` !== item.key)
                );
              }}
              aria-label={`Убрать файл ${item.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        />

        <div className="media-upload-group">
          <label htmlFor={fileInputId} className="media-input-label">
            <span aria-hidden="true">📎</span>{' '}
            {imageFiles.length > 0 ? `Выбрано: ${imageFiles.length}` : 'Добавить фото'}
            <input
              id={fileInputId}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                setImageFiles((current) => [
                  ...current,
                  ...readSelectedFiles(e.target.files)
                ]);
                e.currentTarget.value = '';
              }}
              className="visually-hidden"
            />
          </label>
        </div>

        <button type="submit" className="submit-btn-full">
          Подтвердить
        </button>
      </form>
    </Modal>
  );
}

export default ProductForm;
