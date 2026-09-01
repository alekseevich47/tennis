// @ts-check
import pb from './pb';
import { error } from '../lib/log';

/**
 * Запуск перекодирования сразу после успешного create (не блокирует UI).
 *
 * @param {string} collection
 * @param {string} recordId
 */
export function requestVideoTranscode(collection, recordId) {
  if (!collection || !recordId) return;
  void pb
    .send('/api/video-transcode-now', {
      method: 'POST',
      body: { collection, recordId },
      requestKey: null
    })
    .catch((err) => {
      error('video transcode trigger:', err);
    });
}
