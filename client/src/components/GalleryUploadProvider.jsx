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
import { createGalleryItemWithProgress } from '../services/catalog';
import { compressVideo } from '../lib/compressVideo';
import { isVideoFile } from '../lib/media';
import { error } from '../lib/log';
import './GalleryUploadProvider.css';

const GalleryUploadContext = createContext(null);

const isGalleryKey = (key) => Array.isArray(key) && key[0] === 'gallery';

function createGalleryPayload({ file, aspect_ratio, media_type }) {
  const data = new FormData();
  const mediaType = media_type || (file.type.startsWith('video/') ? 'video' : 'image');
  const fieldName = mediaType === 'video' ? 'video' : 'image';

  data.append(fieldName, file);
  data.append('media_type', mediaType);
  if (typeof aspect_ratio === 'number' && Number.isFinite(aspect_ratio)) {
    data.append('aspect_ratio', String(aspect_ratio));
  }

  return data;
}

/**
 * @param {File} file
 * @returns {Promise<number>}
 */
function getVideoAspectRatio(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.videoWidth / video.videoHeight);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать размеры видео'));
    };
    video.src = objectUrl;
  });
}

/**
 * @param {{ file: File, aspect_ratio?: number, media_type?: string }} item
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 */
async function prepareGalleryUploadItem(item, { signal, onProgress } = {}) {
  if (!isVideoFile(item.file)) return item;

  const preparedFile = await compressVideo(item.file, { signal, onProgress });
  const aspect_ratio = await getVideoAspectRatio(preparedFile);
  return {
    ...item,
    file: preparedFile,
    aspect_ratio,
    media_type: 'video'
  };
}

export function GalleryUploadProvider({ children }) {
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

  const startUpload = useCallback((items) => {
    uploadAbortRef.current?.abort();
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (!Array.isArray(items) || items.length === 0) return;

    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setUploadTask({
      progress: 0,
      status: 'uploading',
      message: `Загрузка 1 из ${items.length}: 0%`
    });

    (async () => {
      const createdItems = [];

      for (let index = 0; index < items.length; index += 1) {
        const currentNumber = index + 1;

        setUploadTask((current) =>
          current
            ? {
                ...current,
                progress: 0,
                message:
                  items[index].media_type === 'video' || isVideoFile(items[index].file)
                    ? `Подготовка видео ${currentNumber} из ${items.length}: 0%`
                    : `Загрузка ${currentNumber} из ${items.length}: 0%`
              }
            : current
        );

        const preparedItem = await prepareGalleryUploadItem(items[index], {
          signal: controller.signal,
          onProgress: (progress) => {
            setUploadTask((current) =>
              current
                ? {
                    ...current,
                    progress: Math.round(progress * 0.4),
                    message:
                      progress < 100
                        ? `Подготовка видео ${currentNumber} из ${items.length}: ${progress}%`
                        : `Загрузка ${currentNumber} из ${items.length}: 0%`
                  }
                : current
            );
          }
        });

        if (controller.signal.aborted) return;

        const payload = createGalleryPayload(preparedItem);

        const createdItem = await createGalleryItemWithProgress(payload, {
          signal: controller.signal,
          onProgress: (progress) => {
            setUploadTask((current) =>
              current
                ? {
                    ...current,
                    progress: Math.round(40 + (progress / 100) * 60),
                    message: `Загрузка ${currentNumber} из ${items.length}: ${progress}%`
                  }
                : current
            );
          }
        });

        if (controller.signal.aborted) return;

        createdItems.push(createdItem);
        mutate(
          isGalleryKey,
          (current = []) => (Array.isArray(current) ? [createdItem, ...current] : current),
          { revalidate: false }
        );
      }

      mutate(isGalleryKey);
      uploadAbortRef.current = null;
      setUploadTask({
        progress: 100,
        status: 'done',
        message: `Добавлено ${createdItems.length} фото/видео`
      });
      hideTimeoutRef.current = window.setTimeout(() => {
        hideTimeoutRef.current = null;
        setUploadTask(null);
      }, 1400);
    })().catch((err) => {
      if (err?.name === 'AbortError') {
        setUploadTask(null);
        return;
      }
      error('create gallery upload:', err);
      setUploadTask({
        progress: 0,
        status: 'error',
        message: 'Не удалось загрузить галерею. Проверьте соединение.'
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
    <GalleryUploadContext.Provider value={value}>
      {children}
      {uploadTask && (
        <div className="gallery-upload-progress" role="status" aria-live="polite">
          <div className="gallery-upload-progress-text">
            <span>{uploadTask.message}</span>
            {uploadTask.status === 'uploading' && (
              <button type="button" onClick={cancelUpload}>
                Отменить
              </button>
            )}
          </div>
          <div className="gallery-upload-progress-track" aria-hidden="true">
            <span style={{ width: `${uploadTask.progress}%` }} />
          </div>
        </div>
      )}
    </GalleryUploadContext.Provider>
  );
}

export function useGalleryUpload() {
  const ctx = useContext(GalleryUploadContext);
  if (!ctx) {
    throw new Error('useGalleryUpload must be used within GalleryUploadProvider');
  }
  return ctx;
}
