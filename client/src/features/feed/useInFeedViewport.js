// @ts-check
import { useCallback, useEffect, useState } from 'react';

/**
 * Карточка в зоне видимости скролл-контейнера ленты.
 * Без root (деталка) — всегда focused.
 *
 * @param {React.RefObject<HTMLElement | null> | null | undefined} scrollRootRef
 * @param {{ enabled?: boolean, threshold?: number }} [options]
 * @returns {{ setRef: (el: HTMLElement | null) => void, focused: boolean }}
 */
export function useInFeedViewport(scrollRootRef, { enabled = true, threshold = 0.28 } = {}) {
  const [node, setNode] = useState(/** @type {HTMLElement | null} */ (null));
  const [focused, setFocused] = useState(() => !scrollRootRef);

  const setRef = useCallback((/** @type {HTMLElement | null} */ el) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setFocused(true);
      return undefined;
    }
    if (!scrollRootRef) {
      setFocused(true);
      return undefined;
    }
    if (!node) return undefined;

    const root = scrollRootRef.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setFocused(
          Boolean(entry?.isIntersecting) && (entry?.intersectionRatio ?? 0) >= threshold
        );
      },
      { root, threshold: [0, threshold, 0.5, 1] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, node, scrollRootRef, threshold]);

  return { setRef, focused };
}
