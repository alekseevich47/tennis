// @ts-check
import { getMediaThumbUrl } from './media';

/**
 * @typedef {Object} UserAvatarLike
 * @property {string} [id]
 * @property {string} [collectionId]
 * @property {string} [collectionName]
 * @property {string} [full_name]
 * @property {string} [name]
 * @property {string | string[] | null} [avatar]
 * @property {string} [avatar_url]
 */

/**
 * Возвращает данные для рендера аватарки: либо src на изображение, либо инициал-fallback.
 * @param {UserAvatarLike | null | undefined} user
 * @returns {{ hasAvatar: boolean, src: string, initial: string }}
 */
export function getUserAvatarData(user) {
  const displayName = user?.full_name || user?.name || '';
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
