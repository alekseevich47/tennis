import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';
import { mutate } from 'swr';
import { createPostWithProgress } from '../services/posts';
import { error } from '../lib/log';
import './PostUploadProvider.css';

const PostUploadContext = createContext(null);

export function PostUploadProvider({ children }) {
  const [uploadTask, setUploadTask] = useState(null);
  const uploadAbortRef = useRef(null);

  const cancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setUploadTask(null);
  }, []);

  const startUpload = useCallback((payload) => {
    uploadAbortRef.current?.abort();

    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setUploadTask({ progress: 0, status: 'uploading', message: 'Загружаем публикацию…' });

    createPostWithProgress(payload, {
      signal: controller.signal,
      onProgress: (progress) => {
        setUploadTask((current) =>
          current ? { ...current, progress, message: `Загрузка медиа: ${progress}%` } : current
        );
      }
    })
      .then((createdPost) => {
        const scheduled = Boolean(createdPost?.is_scheduled);
        if (scheduled) {
          mutate((key) => Array.isArray(key) && key[0] === 'scheduled_posts');
          setUploadTask({
            progress: 100,
            status: 'done',
            message: 'Публикация запланирована'
          });
        } else {
          mutate(
            (key) => Array.isArray(key) && key[0] === 'posts',
            (current = []) => [createdPost, ...current],
            { revalidate: false }
          );
          mutate((key) => Array.isArray(key) && key[0] === 'posts');
          setUploadTask({ progress: 100, status: 'done', message: 'Публикация добавлена' });
        }
        window.setTimeout(() => setUploadTask(null), 1400);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          setUploadTask(null);
          return;
        }
        error('create post upload:', err);
        setUploadTask({
          progress: 0,
          status: 'error',
          message: 'Не удалось опубликовать. Проверьте соединение.'
        });
      });
  }, []);

  const value = useMemo(
    () => ({ startUpload, cancelUpload, uploadTask }),
    [startUpload, cancelUpload, uploadTask]
  );

  return (
    <PostUploadContext.Provider value={value}>
      {children}
      {uploadTask && (
        <div className="post-upload-progress" role="status" aria-live="polite">
          <div className="post-upload-progress-text">
            <span>{uploadTask.message}</span>
            {uploadTask.status === 'uploading' && (
              <button type="button" onClick={cancelUpload}>
                Отменить
              </button>
            )}
          </div>
          <div className="post-upload-progress-track" aria-hidden="true">
            <span style={{ width: `${uploadTask.progress}%` }} />
          </div>
        </div>
      )}
    </PostUploadContext.Provider>
  );
}

export function usePostUpload() {
  const ctx = useContext(PostUploadContext);
  if (!ctx) {
    throw new Error('usePostUpload must be used within PostUploadProvider');
  }
  return ctx;
}
