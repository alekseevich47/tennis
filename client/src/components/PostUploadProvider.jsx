import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';
import { mutate } from 'swr';
import { isDefinitePostCreateFailure, publishPost } from '../services/posts';
import { error } from '../lib/log';
import './PostUploadProvider.css';

const PostUploadContext = createContext(null);

function revalidatePosts() {
  return mutate((key) => Array.isArray(key) && key[0] === 'posts');
}

/**
 * @param {import('../services/posts').PostRecord} createdPost
 */
function prependPostToFeed(createdPost) {
  const scheduled = Boolean(createdPost?.is_scheduled);
  if (scheduled) {
    mutate((key) => Array.isArray(key) && key[0] === 'scheduled_posts');
    return { progress: 100, status: 'done', message: 'Публикация запланирована' };
  }
  mutate(
    (key) => Array.isArray(key) && key[0] === 'posts',
    (current = []) => [createdPost, ...current],
    { revalidate: false }
  );
  void revalidatePosts();
  return { progress: 100, status: 'done', message: 'Публикация добавлена' };
}

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

    publishPost(payload, {
      signal: controller.signal,
      onProgress: (progress) => {
        setUploadTask((current) =>
          current
            ? {
                ...current,
                progress,
                message: progress >= 100 ? 'Публикация добавлена' : 'Загружаем публикацию…'
              }
            : current
        );
      }
    })
      .then((createdPost) => {
        setUploadTask(prependPostToFeed(createdPost));
        window.setTimeout(() => setUploadTask(null), 1400);
      })
      .catch(async (err) => {
        if (err?.name === 'AbortError') {
          setUploadTask(null);
          return;
        }
        error('create post upload:', err);
        try {
          await revalidatePosts();
        } catch (revalidateErr) {
          error('create post revalidate:', revalidateErr);
        }
        if (isDefinitePostCreateFailure(err)) {
          setUploadTask({
            progress: 0,
            status: 'error',
            message: 'Не удалось опубликовать. Проверьте соединение.'
          });
          return;
        }
        setUploadTask({
          progress: 100,
          status: 'done',
          message: 'Публикация добавлена'
        });
        window.setTimeout(() => setUploadTask(null), 1400);
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
