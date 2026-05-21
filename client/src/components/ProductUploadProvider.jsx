import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { mutate } from 'swr';
import { createProductWithProgress, updateProduct } from '../services/catalog';
import { error } from '../lib/log';
import './ProductUploadProvider.css';

const ProductUploadContext = createContext(null);

const isProductsKey = (key) => Array.isArray(key) && key[0] === 'products';

export function ProductUploadProvider({ children }) {
  const [uploadTask, setUploadTask] = useState(null);
  const uploadAbortRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const cancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setUploadTask(null);
  }, []);

  const startUpload = useCallback((payload, productId) => {
    uploadAbortRef.current?.abort();
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const isEditing = Boolean(productId);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setUploadTask({
      progress: isEditing ? 35 : 0,
      status: 'uploading',
      message: isEditing ? 'Сохраняем товар…' : 'Загружаем товар…',
      canCancel: !isEditing
    });

    const saveProduct = isEditing
      ? updateProduct(productId, payload)
      : createProductWithProgress(payload, {
          signal: controller.signal,
          onProgress: (progress) => {
            setUploadTask((current) =>
              current
                ? { ...current, progress, message: `Загрузка медиа: ${progress}%` }
                : current
            );
          }
        });

    saveProduct
      .then((savedProduct) => {
        if (controller.signal.aborted) return;

        if (isEditing) {
          mutate(
            isProductsKey,
            (current = []) =>
              Array.isArray(current)
                ? current.map((product) =>
                    product.id === savedProduct.id ? savedProduct : product
                  )
                : current,
            { revalidate: false }
          );
        }

        mutate(isProductsKey);
        setUploadTask({
          progress: 100,
          status: 'done',
          message: isEditing ? 'Товар сохранён' : 'Товар добавлен',
          canCancel: false
        });
        hideTimeoutRef.current = window.setTimeout(() => {
          hideTimeoutRef.current = null;
          setUploadTask(null);
        }, 1400);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          setUploadTask(null);
          return;
        }
        error(isEditing ? 'update product upload:' : 'create product upload:', err);
        setUploadTask({
          progress: 0,
          status: 'error',
          message: 'Не удалось сохранить товар. Проверьте соединение.',
          canCancel: false
        });
      });
  }, []);

  useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    },
    []
  );

  const value = useMemo(
    () => ({ startUpload, cancelUpload, uploadTask }),
    [startUpload, cancelUpload, uploadTask]
  );

  return (
    <ProductUploadContext.Provider value={value}>
      {children}
      {uploadTask && (
        <div className="product-upload-progress" role="status" aria-live="polite">
          <div className="product-upload-progress-text">
            <span>{uploadTask.message}</span>
            {uploadTask.status === 'uploading' && uploadTask.canCancel && (
              <button type="button" onClick={cancelUpload}>
                Отменить
              </button>
            )}
          </div>
          <div className="product-upload-progress-track" aria-hidden="true">
            <span style={{ width: `${uploadTask.progress}%` }} />
          </div>
        </div>
      )}
    </ProductUploadContext.Provider>
  );
}

export function useProductUpload() {
  const ctx = useContext(ProductUploadContext);
  if (!ctx) {
    throw new Error('useProductUpload must be used within ProductUploadProvider');
  }
  return ctx;
}
