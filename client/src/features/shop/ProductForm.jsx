import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import SortableMediaPreviewGrid from '../feed/SortableMediaPreviewGrid';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import { useLocalMediaFullscreen } from '../feed/useLocalMediaFullscreen';
import { useProductCategories } from '../../hooks/useProductCategories';
import {
  getMediaUrl,
  isVideoFile,
  isVideoMediaName,
  mediaNames,
  readSelectedFiles
} from '../../lib/media';
import { compressImage } from '../../lib/compress';

const INITIAL = {
  title: '',
  description: '',
  price: '',
  old_price: '',
  sizes: '',
  categories: /** @type {string[]} */ ([]),
  out_of_stock: false
};

const MAX_PRODUCT_IMAGES = 5;

function parsePrice(value) {
  return parseFloat(value) || 0;
}

/** @param {unknown} value @returns {number | null} */
function parseOptionalOldPrice(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** @param {unknown} raw @returns {string[]} */
function normalizeCategoryIds(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  return first ? [String(first)] : [];
}

/** Порядок не важен (категории). */
function areStringSetsEqual(left, right) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((value) => leftSet.has(value));
}

/** Порядок важен (имена медиа). */
function areStringArraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

/**
 * @typedef {{
 *   key: string,
 *   kind: 'existing' | 'new',
 *   filename?: string,
 *   file?: File,
 *   url: string,
 *   name: string,
 *   isVideo: boolean
 * }} ProductMediaItem
 */

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
  const { confirm } = useAlertDialog();
  const { data: categories = [] } = useProductCategories();
  const [form, setForm] = useState(() => ({
    ...INITIAL,
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    old_price: Number(product?.old_price) > 0 ? String(product.old_price) : '',
    sizes: product?.sizes || '',
    categories: normalizeCategoryIds(product?.categories),
    out_of_stock: Boolean(product?.out_of_stock)
  }));
  /** @type {[ProductMediaItem[], React.Dispatch<React.SetStateAction<ProductMediaItem[]>>]} */
  const [orderedMedia, setOrderedMedia] = useState([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  const originalExistingNames = useMemo(
    () => (product ? mediaNames(product.images) : []),
    [product]
  );

  const remainingImageSlots = Math.max(0, MAX_PRODUCT_IMAGES - orderedMedia.length);
  const categoryLabel = useMemo(() => {
    if (form.categories.length === 0) return 'Категория не выбрана';
    const selected = categories.find((category) => category.id === form.categories[0]);
    return selected?.name ? `Выбрано: ${selected.name}` : 'Категория не выбрана';
  }, [categories, form.categories]);

  const previewItems = useMemo(
    () =>
      orderedMedia.map((item) => ({
        key: item.key,
        url: item.url,
        name: item.name,
        isVideo: item.isVideo,
        status: 'ready'
      })),
    [orderedMedia]
  );

  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    onCloseStart: handlePreviewCloseStart,
    handleActiveIndexChange: handlePreviewIndexChange
  } = useLocalMediaFullscreen(previewItems, 'product-form');

  useEffect(() => {
    return () => {
      orderedMedia.forEach((item) => {
        if (item.kind === 'new' && item.url?.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount only
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...INITIAL,
      title: product?.title || '',
      description: product?.description || '',
      price: product?.price?.toString() || '',
      old_price: Number(product?.old_price) > 0 ? String(product.old_price) : '',
      sizes: product?.sizes || '',
      categories: normalizeCategoryIds(product?.categories),
      out_of_stock: Boolean(product?.out_of_stock)
    });
    setOrderedMedia(
      product
        ? mediaNames(product.images).flatMap((filename) => {
            const url = getMediaUrl(product, 'products', filename);
            return url
              ? [
                  {
                    key: `existing-${filename}`,
                    kind: /** @type {'existing'} */ ('existing'),
                    filename,
                    url,
                    name: filename,
                    isVideo: isVideoMediaName(filename)
                  }
                ]
              : [];
          })
        : []
    );
    setIsCategoryMenuOpen(false);
    setCategoryError(false);
  }, [isOpen, product]);

  const updateField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectCategory = (categoryId) => {
    setCategoryError(false);
    setForm((prev) => ({
      ...prev,
      categories: [categoryId]
    }));
    setIsCategoryMenuOpen(false);
  };

  const removeMedia = (key) => {
    setOrderedMedia((current) => {
      const target = current.find((item) => item.key === key);
      if (target?.kind === 'new' && target.url?.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return current.filter((item) => item.key !== key);
    });
  };

  const isDirty = useCallback(() => {
    const currentCategories = normalizeCategoryIds(product?.categories);
    if (!product) {
      return (
        Boolean(form.title.trim()) ||
        Boolean(form.description.trim()) ||
        Boolean(form.price.trim()) ||
        Boolean(form.old_price.trim()) ||
        Boolean(form.sizes.trim()) ||
        form.categories.length > 0 ||
        form.out_of_stock ||
        orderedMedia.length > 0
      );
    }
    if (form.title !== (product.title || '')) return true;
    if (form.description !== (product.description || '')) return true;
    if (parsePrice(form.price) !== parsePrice(String(product.price ?? ''))) return true;
    if (parseOptionalOldPrice(form.old_price) !== parseOptionalOldPrice(product?.old_price)) {
      return true;
    }
    if (form.sizes !== (product.sizes || '')) return true;
    if (form.out_of_stock !== Boolean(product.out_of_stock)) return true;
    if (!areStringSetsEqual(form.categories, currentCategories)) return true;
    const keptExistingNames = orderedMedia
      .filter((item) => item.kind === 'existing')
      .map((item) => item.filename)
      .filter(Boolean);
    if (!areStringArraysEqual(keptExistingNames, originalExistingNames)) return true;
    if (orderedMedia.some((item) => item.kind === 'new')) return true;
    return false;
  }, [form, orderedMedia, originalExistingNames, product]);

  const handleClose = useCallback(async () => {
    if (isDirty()) {
      const ok = await confirm({
        title: product ? 'Выйти из редактирования?' : 'Отменить создание товара?',
        message: 'Несохранённые изменения будут потеряны.',
        confirmText: 'Выйти',
        cancelText: 'Продолжить',
        confirmVariant: 'danger'
      });
      if (!ok) return;
    }
    onClose();
  }, [confirm, isDirty, onClose, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.categories.length === 0) {
      setCategoryError(true);
      setIsCategoryMenuOpen(true);
      return;
    }

    const data = new FormData();
    const nextTitle = form.title.trim();
    const nextDescription = form.description.trim();
    const nextPrice = parsePrice(form.price);
    const nextOldPrice = parseOptionalOldPrice(form.old_price);
    const prevOldPrice = parseOptionalOldPrice(product?.old_price);
    const nextSizes = form.sizes.trim();
    const currentCategories = normalizeCategoryIds(product?.categories);
    const hasCategoryChanges = !areStringSetsEqual(form.categories, currentCategories);

    if (!product || nextTitle !== (product.title || '')) {
      data.append('title', nextTitle);
    }
    if (!product || nextDescription !== (product.description || '')) {
      data.append('description', nextDescription);
    }
    if (!product || nextPrice !== parsePrice(String(product.price ?? ''))) {
      data.append('price', String(nextPrice));
    }
    if (!product || nextOldPrice !== prevOldPrice) {
      if (product || nextOldPrice != null) {
        data.append('old_price', nextOldPrice == null ? '' : String(nextOldPrice));
      }
    }
    if (!product || nextSizes !== (product.sizes || '')) {
      data.append('sizes', nextSizes);
    }
    if (!product || form.out_of_stock !== Boolean(product.out_of_stock)) {
      data.append('out_of_stock', String(form.out_of_stock));
    }

    const keptExistingNames = orderedMedia
      .filter((item) => item.kind === 'existing')
      .map((item) => item.filename)
      .filter(Boolean);
    const deletedNames = originalExistingNames.filter((name) => !keptExistingNames.includes(name));
    const existingOrderChanged =
      Boolean(product) &&
      !areStringArraysEqual(
        keptExistingNames,
        originalExistingNames.filter((name) => keptExistingNames.includes(name))
      );
    const newFiles = orderedMedia.filter((item) => item.kind === 'new');
    const needsFullRewrite =
      Boolean(product) &&
      orderedMedia.length > 0 &&
      (existingOrderChanged ||
        (newFiles.length > 0 &&
          orderedMedia.some((item, index) => {
            if (item.kind !== 'new') return false;
            return orderedMedia.slice(index + 1).some((later) => later.kind === 'existing');
          })));

    if (needsFullRewrite) {
      originalExistingNames.forEach((filename) => data.append('images-', filename));
      for (const item of orderedMedia) {
        if (item.kind === 'existing' && item.url) {
          const res = await fetch(item.url);
          const blob = await res.blob();
          data.append(
            'images',
            new File([blob], item.filename || item.name || 'image.jpg', {
              type: blob.type || 'image/jpeg'
            })
          );
        } else if (item.file) {
          data.append('images', await compressImage(item.file));
        }
      }
    } else {
      deletedNames.forEach((filename) => data.append('images-', filename));
      const imageFieldName = product ? 'images+' : 'images';
      const compressed = await Promise.all(newFiles.map((item) => compressImage(/** @type {File} */ (item.file))));
      compressed.forEach((img) => data.append(imageFieldName, img));
    }

    if (!product || hasCategoryChanges) {
      form.categories.forEach((categoryId) => data.append('categories', categoryId));
    }
    if (product && Array.from(data.keys()).length === 0) {
      onClose();
      return;
    }
    setCategoryError(false);
    onSubmit(data);
    onClose();
  };

  const newCount = orderedMedia.filter((item) => item.kind === 'new').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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

        <div className="product-form-price-row">
          <div className="form-group">
            <label htmlFor="product-price">Актуальная цена, ₽</label>
            <input
              id="product-price"
              type="number"
              min="0"
              step="any"
              value={form.price}
              onChange={(e) => updateField('price')(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="product-old-price">Старая цена, ₽</label>
            <input
              id="product-old-price"
              type="number"
              min="0"
              step="any"
              value={form.old_price}
              onChange={(e) => updateField('old_price')(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
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

        <div className="form-group" aria-invalid={categoryError}>
          <span className="product-form-label">Категория</span>
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
                    <button
                      key={category.id}
                      type="button"
                      role="option"
                      aria-selected={form.categories[0] === category.id}
                      className="product-category-option"
                      onClick={() => selectCategory(category.id)}
                    >
                      <span
                        className={
                          form.categories[0] === category.id
                            ? 'product-category-option__mark is-selected'
                            : 'product-category-option__mark'
                        }
                        aria-hidden="true"
                      />
                      <span>{category.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {categoryError && (
            <span className="form-error" role="alert">Выберите категорию</span>
          )}
        </div>

        <label className="product-stock-toggle">
          <input
            type="checkbox"
            checked={form.out_of_stock}
            onChange={(e) => updateField('out_of_stock')(e.target.checked)}
          />
          <span>Нет в наличии</span>
        </label>

        <div className="product-form-media-strip-wrap">
          <SortableMediaPreviewGrid
            items={previewItems}
            layout="strip"
            onReorder={(next) => {
              const byKey = new Map(orderedMedia.map((item) => [item.key, item]));
              setOrderedMedia(
                next
                  .map((item) => byKey.get(item.key))
                  .filter(Boolean)
              );
            }}
            onItemClick={(item, index, event) => openPreviewMedia(item, index, event)}
            className="product-form-preview-strip"
            getAction={(item) => (
              <button
                type="button"
                className="media-remove-btn comment-media-remove-btn"
                onClick={() => removeMedia(item.key)}
                aria-label={`Убрать файл ${item.name}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          />
        </div>
        <div className="media-upload-group">
          <label htmlFor={fileInputId} className="media-input-label">
            <span aria-hidden="true">📎</span>{' '}
            {newCount > 0 ? `Выбрано: ${newCount}` : 'Добавить фото'}
            <input
              id={fileInputId}
              type="file"
              multiple
              accept="image/*"
              disabled={remainingImageSlots === 0}
              onChange={(e) => {
                const incoming = readSelectedFiles(e.target.files, remainingImageSlots);
                setOrderedMedia((current) => {
                  const next = [...current];
                  for (const file of incoming) {
                    if (next.length >= MAX_PRODUCT_IMAGES) break;
                    next.push({
                      key: `new-${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
                      kind: 'new',
                      file,
                      url: URL.createObjectURL(file),
                      name: file.name,
                      isVideo: isVideoFile(file)
                    });
                  }
                  return next;
                });
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
      {previewFullscreen ? (
        <FullscreenImageViewer
          items={previewFullscreen.items}
          initialIndex={previewFullscreen.index}
          originRect={previewFullscreen.originRect}
          originKey={previewFullscreen.originKey}
          onCloseStart={handlePreviewCloseStart}
          onActiveIndexChange={handlePreviewIndexChange}
          onClose={closePreviewFullscreen}
        />
      ) : null}
    </Modal>
  );
}

export default ProductForm;
