// @ts-check

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_VIDEO_MAX_MB = 30;

/**
 * @typedef {{ maxWidth?: number, quality?: number }} CompressImageOptions
 */

/**
 * @param {string} filename
 * @param {string} extension
 */
function withExtension(filename, extension) {
  return filename.replace(/\.[^.]+$/, '') + extension;
}

/**
 * @param {ImageBitmap} bitmap
 */
function hasTransparency(bitmap) {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return false;

  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }

  return false;
}

/**
 * Сжимает изображение через OffscreenCanvas. GIF возвращается без изменений.
 * @param {File} file
 * @param {CompressImageOptions} [options]
 * @returns {Promise<File>}
 */
export async function compressImage(file, options = {}) {
  if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) return file;
  if (!file.type.startsWith('image/')) return file;

  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const keepPng =
      (file.type === 'image/png' || /\.png$/i.test(file.name)) &&
      hasTransparency(bitmap);
    const outputType = keepPng ? 'image/png' : 'image/webp';
    const extension = keepPng ? '.png' : '.webp';
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas context is unavailable');
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvas.convertToBlob({
      type: outputType,
      quality: outputType === 'image/webp' ? quality : undefined,
    });

    return new File([blob], withExtension(file.name, extension), {
      type: outputType,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

/**
 * @param {File} file
 * @param {number} [maxMb]
 */
export function validateVideoFile(file, maxMb = DEFAULT_VIDEO_MAX_MB) {
  if (file.size > maxMb * 1024 ** 2) {
    throw new Error(`Видео больше ${maxMb} МБ`);
  }
}
