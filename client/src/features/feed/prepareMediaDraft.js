import { compressImage } from '../../lib/compress';
import { isVideoFile } from '../../lib/media';

/**
 * Подготовка файла для прикрепления в комментарии: сжатие изображений + blob URL.
 * Видео в комментариях не поддерживается.
 *
 * @param {File} file
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<{ file: File, url: string, isVideo: boolean, name: string }>}
 */
export async function prepareCommentMediaFile(file, onProgress) {
  onProgress?.(8);

  if (isVideoFile(file) || file.type.startsWith('video/')) {
    throw new Error('Видео в комментариях не поддерживается');
  }

  if (file.type.startsWith('image/') || /\.gif$/i.test(file.name)) {
    onProgress?.(22);
    const prepared = await compressImage(file);
    onProgress?.(78);
    const url = URL.createObjectURL(prepared);
    onProgress?.(100);
    return {
      file: prepared,
      url,
      isVideo: false,
      name: prepared.name
    };
  }

  throw new Error('Поддерживаются только изображения');
}
