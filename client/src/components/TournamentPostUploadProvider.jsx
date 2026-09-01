import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';
import { mutate } from 'swr';
import { publishTournamentPostWithProgress } from '../services/tournamentPosts';
import { error } from '../lib/log';
import './PostUploadProvider.css';

const TournamentPostUploadContext = createContext(null);

export function TournamentPostUploadProvider({ children }) {
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
    setUploadTask({ progress: 0, status: 'uploading', message: 'Загружаем итоги турнира…' });

    publishTournamentPostWithProgress(payload, {
      signal: controller.signal,
      onProgress: (progress) => {
        setUploadTask((current) =>
          current
            ? {
                ...current,
                progress,
                message: `Загрузка медиа: ${progress}%`
              }
            : current
        );
      }
    })
      .then((createdPost) => {
        const scheduled = Boolean(createdPost?.is_scheduled);
        if (scheduled) {
          mutate((key) => Array.isArray(key) && key[0] === 'scheduled_tournament_posts');
          setUploadTask({
            progress: 100,
            status: 'done',
            message: 'Публикация запланирована'
          });
        } else {
          mutate(
            (key) => Array.isArray(key) && key[0] === 'tournament_posts',
            (current = []) => [createdPost, ...current],
            { revalidate: false }
          );
          mutate((key) => Array.isArray(key) && key[0] === 'tournament_posts');
          mutate((key) => Array.isArray(key) && key[0] === 'players');
          setUploadTask({
            progress: 100,
            status: 'done',
            message: 'Итоги турнира опубликованы'
          });
        }
        window.setTimeout(() => setUploadTask(null), 1400);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          setUploadTask(null);
          return;
        }
        error('create tournament post upload:', err);
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
    <TournamentPostUploadContext.Provider value={value}>
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
    </TournamentPostUploadContext.Provider>
  );
}

export function useTournamentPostUpload() {
  const ctx = useContext(TournamentPostUploadContext);
  if (!ctx) {
    throw new Error('useTournamentPostUpload must be used within TournamentPostUploadProvider');
  }
  return ctx;
}
