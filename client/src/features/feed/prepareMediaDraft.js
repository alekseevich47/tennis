import { compressImage } from '../../lib/compress';
import { isVideoFile } from '../../lib/media';

/**
 * Подготовка файла для прикрепления в комментарии: сжатие изображений + blob URL.
 *
 * @param {File} file
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<{ file: File, url: string, isVideo: boolean, name: string }>}
 */
export async function prepareCommentMediaFile(file, onProgress) {
  onProgress?.(8);

  if (file.type.startsWith('image/')) {
    onProgress?.(22);
    const prepared = await compressImage(file);
    onProgress?.(78);
    const url = URL.createObjectURL(prepared);
    onProgress?.(100);
    return {
      file: prepared,
      url,
      isVideo: isVideoFile(prepared),
      name: prepared.name
    };
  }

  onProgress?.(35);
  const url = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const finish = () => {
      onProgress?.(100);
      resolve(undefined);
    };
    video.onloadedmetadata = finish;
    video.onloadeddata = finish;
    video.onerror = () => reject(new Error('Не удалось прочитать видео'));
    video.src = url;
  });

  return {
    file,
    url,
    isVideo: isVideoFile(file),
    name: file.name
  };
}
