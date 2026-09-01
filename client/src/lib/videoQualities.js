// @ts-check
import { isVideoPosterUrl } from './media';

/**
 * @typedef {{ id: string, label: string, src: string }} VideoQualityOption
 */

/**
 * Собирает варианты качества из метаданных медиа.
 * Если есть отдельное превью (обычно LQIP / thumb) — считаем его «480p»,
 * оригинал — «Оригинал». Для одного URL — только «Авто».
 *
 * @param {{ url?: string, previewUrl?: string, thumbUrl?: string }} item
 * @returns {VideoQualityOption[]}
 */
export function resolveVideoQualities(item) {
  const original = item?.url || '';
  const preview = item?.previewUrl || item?.thumbUrl || '';
  if (!original && !preview) return [];

  if (preview && original && preview !== original && !isVideoPosterUrl(preview)) {
    return [
      { id: '480p', label: '480p', src: preview },
      { id: 'original', label: 'Оригинал', src: original }
    ];
  }

  const src = original || preview;
  return [{ id: 'auto', label: 'Авто', src }];
}
