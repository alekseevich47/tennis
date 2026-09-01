// @ts-check
import { compressImage } from './compress';
import { compressVideo, isPreparedVideoFile } from './compressVideo';
import { isVideoFile } from './media';

/**
 * @param {File} file
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<File>}
 */
export async function prepareUploadMedia(file, { onProgress, signal } = {}) {
  if (isVideoFile(file)) {
    if (isPreparedVideoFile(file)) {
      onProgress?.(100);
      return file;
    }
    return compressVideo(file, { onProgress, signal });
  }

  if (file.type.startsWith('image/') && !/\.gif$/i.test(file.name)) {
    onProgress?.(100);
    return compressImage(file);
  }

  onProgress?.(100);
  return file;
}

/**
 * @param {File[]} files
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<File[]>}
 */
export async function prepareUploadMediaList(files, { onProgress, signal } = {}) {
  if (!files.length) return [];

  const prepared = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const sliceStart = (index / files.length) * 100;
    const sliceSize = 100 / files.length;

    const next = await prepareUploadMedia(file, {
      signal,
      onProgress: (percent) => {
        onProgress?.(Math.round(sliceStart + (percent / 100) * sliceSize));
      }
    });
    prepared.push(next);
  }

  onProgress?.(100);
  return prepared;
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function prepareMediaInBody(body, { onProgress, signal } = {}) {
  const media = body.media;
  if (!media) return body;

  const files = Array.isArray(media) ? media : [media];
  const fileList = files.filter((item) => item instanceof File);
  if (!fileList.length) return body;

  const prepared = await prepareUploadMediaList(fileList, {
    signal,
    onProgress: (percent) => onProgress?.(Math.round(percent * 0.4))
  });

  return {
    ...body,
    media: Array.isArray(media) ? prepared : prepared[0]
  };
}

/**
 * Прогресс upload: 0–40% подготовка, 40–100% отправка.
 *
 * @param {number} uploadPercent 0–100
 */
export function mapUploadProgress(uploadPercent) {
  return Math.min(100, Math.round(40 + (uploadPercent / 100) * 60));
}
