import { compressImage } from '../../lib/compress';
import { compressVideo } from '../../lib/compressVideo';
import { isVideoFile } from '../../lib/media';

/**
 * Подготовка файла для прикрепления в комментарии: сжатие / чтение metadata + blob URL.
 *
 * @param {File} file
 * @param {(percent: number) => void} [onProgress]
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ file: File, url: string, isVideo: boolean, name: string }>}
 */
export async function prepareCommentMediaFile(file, onProgress, signal) {
  onProgress?.(4);

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

  if (isVideoFile(file)) {
    const prepared = await compressVideo(file, {
      signal,
      onProgress: (percent) => onProgress?.(Math.max(4, percent))
    });
    const url = URL.createObjectURL(prepared);
    return {
      file: prepared,
      url,
      isVideo: true,
      name: prepared.name
    };
  }

  onProgress?.(100);
  const url = URL.createObjectURL(file);
  return {
    file,
    url,
    isVideo: isVideoFile(file),
    name: file.name
  };
}
