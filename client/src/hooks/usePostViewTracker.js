// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import { recordContentView } from '../services/stats';

/** Задержка удержания во viewport (как READ_VISIBLE_DELAY_MS у уведомлений). */
export const POST_VIEW_VISIBLE_DELAY_MS = 1200;

/**
 * Viewport-просмотр через компактный якорь (1px вверху карточки).
 * Якорь ≥~50% видимости ≥ 1200 ms → +1 в content_views (source: viewport).
 * Без дедупа: таймер сбрасывается при уходе; повторное удержание = новая запись.
 *
 * Важно: наблюдать якорь, а не всю карточку — у высоких постов с медиа
 * intersectionRatio всей карточки часто < 0.5, и просмотр не фиксировался.
 *
 * @param {{
 *   objectType: 'post' | 'tournament_post',
 *   objectId: string | null | undefined,
 *   enabled?: boolean,
 *   scrollRootRef?: React.RefObject<HTMLElement | null> | null
 * }} params
 * @returns {(node: HTMLElement | null) => void} callback-ref на якорь
 */
export function usePostViewTracker({
  objectType,
  objectId,
  enabled = true,
  scrollRootRef = null
}) {
  const [node, setNode] = useState(/** @type {HTMLElement | null} */ (null));
  const timeoutRef = useRef(/** @type {number | null} */ (null));
  /** Уже записали за текущую сессию видимости (сброс при уходе из зоны). */
  const recordedSessionRef = useRef(false);

  const setRef = useCallback((/** @type {HTMLElement | null} */ el) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!enabled || !objectId || !node) return undefined;

    const root = scrollRootRef?.current ?? null;

    const clearTimer = () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Для 1px-якоря ratio ≈ 0 или 1; берём isIntersecting + небольшой порог.
        const visible =
          Boolean(entry?.isIntersecting) && (entry?.intersectionRatio ?? 0) >= 0.5;

        if (!visible) {
          clearTimer();
          recordedSessionRef.current = false;
          return;
        }

        if (recordedSessionRef.current || timeoutRef.current != null) return;

        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
          if (recordedSessionRef.current) return;
          recordedSessionRef.current = true;
          void recordContentView({
            objectType,
            objectId,
            source: 'viewport'
          }).catch(() => {
            recordedSessionRef.current = false;
          });
        }, POST_VIEW_VISIBLE_DELAY_MS);
      },
      { root, threshold: [0, 0.5, 1] }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      clearTimer();
      recordedSessionRef.current = false;
    };
  }, [objectType, objectId, enabled, scrollRootRef, node]);

  return setRef;
}
