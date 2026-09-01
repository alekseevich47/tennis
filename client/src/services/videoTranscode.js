// @ts-check
import pb from './pb';
import { error } from '../lib/log';

/** Не мешать первому стриму видео в ленте (remux заменяет файл на диске). */
const TRANSCODE_DELAY_MS = 60000;

/**
 * Запуск перекодирования после паузы (не блокирует UI).
 *
 * @param {string} collection
 * @param {string} recordId
 */
export function requestVideoTranscode(collection, recordId) {
  if (!collection || !recordId) return;
  window.setTimeout(() => {
    void pb
      .send('/api/video-transcode-now', {
        method: 'POST',
        body: { collection, recordId },
        requestKey: null
      })
      .catch((err) => {
        error('video transcode trigger:', err);
      });
  }, TRANSCODE_DELAY_MS);
}
