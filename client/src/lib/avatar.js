// @ts-check
import { getMediaThumbUrl } from './media';

/**
 * @typedef {Object} UserAvatarLike
 * @property {string} [id]
 * @property {string} [collectionId]
 * @property {string} [collectionName]
 * @property {string} [full_name]
 * @property {string | string[] | null} [avatar]
 * @property {string} [avatar_url]
 */

const AVATAR_EXPORT_SIZE = 256;
const AVATAR_EXPORT_QUALITY = 0.82;

/**
 * Квадратный webp для хранения в БД (обрезка уже сделана в AvatarCropModal).
 * @param {Blob | File} source
 * @returns {Promise<File>}
 */
export async function exportAvatarFile(source) {
  const input =
    source instanceof File
      ? source
      : new File([source], 'avatar.png', { type: source.type || 'image/png' });
  const bitmap = await createImageBitmap(input);
  try {
    const canvas = new OffscreenCanvas(AVATAR_EXPORT_SIZE, AVATAR_EXPORT_SIZE);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context is unavailable');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, AVATAR_EXPORT_SIZE, AVATAR_EXPORT_SIZE);
    context.drawImage(bitmap, 0, 0, AVATAR_EXPORT_SIZE, AVATAR_EXPORT_SIZE);
    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: AVATAR_EXPORT_QUALITY
    });
    return new File([blob], 'avatar.webp', {
      type: 'image/webp',
      lastModified: Date.now()
    });
  } finally {
    bitmap.close();
  }
}

/**
 * Возвращает данные для рендера аватарки: либо src на изображение, либо инициал-fallback.
 * @param {UserAvatarLike | null | undefined} user
 * @returns {{ hasAvatar: boolean, src: string, initial: string }}
 */
export function getUserAvatarData(user) {
  const displayName = user?.full_name || '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  // 1. Локально загруженный аватар должен перекрывать внешний MAX URL.
  const src = getMediaThumbUrl(user || null, 'users', user?.avatar, '200x200t');
  if (src) {
    return { hasAvatar: true, src, initial };
  }

  // 2. Если локального файла нет — используем готовую ссылку MAX Bridge.
  if (user?.avatar_url) {
    return { hasAvatar: true, src: user.avatar_url, initial };
  }

  return { hasAvatar: false, src: '', initial };
}
