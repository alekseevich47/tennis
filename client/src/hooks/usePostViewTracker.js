// @ts-check
import { useEffect, useRef } from 'react';
import { recordContentView } from '../services/stats';

/** Задержка удержания во viewport (как READ_VISIBLE_DELAY_MS у уведомлений). */
export const POST_VIEW_VISIBLE_DELAY_MS = 1200;

/**
 * Viewport-просмотр: ≥~50% видимости ≥ 1200 ms → +1 в content_views (source: viewport).
 * Без дедупа: таймер сбрасывается при уходе; повторное удержание = новая запись.
 *
 * @param {{
 *   objectType: 'post' | 'tournament_post',
 *   objectId: string | null | undefined,
 *   enabled?: boolean,
 *   scrollRootRef?: React.RefObject<HTMLElement | null> | null
 * }} params
 * @returns {React.RefObject<HTMLElement | null>}
 */
export function usePostViewTracker({
  objectType,
  objectId,
  enabled = true,
  scrollRootRef = null
}) {
  const targetRef = useRef(/** @type {HTMLElement | null} */ (null));
  const timeoutRef = useRef(/** @type {number | null} */ (null));
  /** Уже записали за текущую сессию видимости (сброс при уходе из зоны). */
  const recordedSessionRef = useRef(false);

  useEffect(() => {
    if (!enabled || !objectId) return undefined;

    const target = targetRef.current;
    if (!target) return undefined;

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

    observer.observe(target);
    return () => {
      observer.disconnect();
      clearTimer();
      recordedSessionRef.current = false;
    };
  }, [objectType, objectId, enabled, scrollRootRef]);

  return targetRef;
}
