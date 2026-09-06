import skeletonUrl from '../assets/skeleton.jpg';

/** Hashed URL ассета `skeleton.jpg` (Vite). */
export const MEDIA_SKELETON_URL = skeletonUrl;

let preloaded = false;

/**
 * Warm-decode плейсхолдера медиа при старте приложения.
 * CSS уже ссылается на тот же файл через `--media-skeleton-image`.
 */
export function preloadMediaSkeleton() {
  if (preloaded || typeof window === 'undefined' || typeof document === 'undefined') return;
  preloaded = true;

  try {
    if (!document.querySelector(`link[data-media-skeleton-preload="1"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = skeletonUrl;
      link.dataset.mediaSkeletonPreload = '1';
      document.head.appendChild(link);
    }

    const img = new Image();
    img.decoding = 'async';
    img.src = skeletonUrl;
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {});
    }
  } catch {
    /* preload не должен валить boot */
  }
}
