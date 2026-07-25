import { useCallback, useEffect, useRef, useState } from 'react';

/** Высота sticky-плашки — линия «прохождения» и scroll-margin. */
export const PINNED_BANNER_OFFSET_PX = 72;

/**
 * Порядок закрепов в плашке = порядок в ленте сверху вниз (`-created`).
 * @param {Array<{ id: string, created?: string }>} posts
 */
export function sortPinnedByCreated(posts) {
  return [...posts].sort((a, b) => {
    const aTime = a.created ? Date.parse(a.created) : 0;
    const bTime = b.created ? Date.parse(b.created) : 0;
    return bTime - aTime;
  });
}

/**
 * Индекс «следующего» закрепа для плашки: после последнего, чей top
 * уже на линии sticky-зоны или выше (в т.ч. при быстром скролле — без пропусков).
 *
 * @param {Array<{ id: string }>} pinnedPosts
 * @param {Map<string, HTMLElement>} cardRefsMap
 * @param {HTMLElement} container
 * @param {number} bandPx
 */
export function computePinnedBannerIndex(pinnedPosts, cardRefsMap, container, bandPx) {
  const count = pinnedPosts.length;
  if (count <= 1) return 0;

  const line = container.getBoundingClientRect().top + bandPx;
  let lastAtOrAbove = -1;

  for (let i = 0; i < count; i++) {
    const el = cardRefsMap.get(pinnedPosts[i].id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= line + 1) {
      lastAtOrAbove = i;
    }
  }

  return (lastAtOrAbove + 1) % count;
}

/**
 * @param {{
 *   pinnedPosts: Array<{ id: string, created?: string }>,
 *   containerRef: React.RefObject<HTMLElement | null>,
 *   cardRefs: React.MutableRefObject<Map<string, HTMLElement>>,
 *   enabled?: boolean,
 *   bandPx?: number
 * }} opts
 */
export function usePinnedBannerIndex({
  pinnedPosts,
  containerRef,
  cardRefs,
  enabled = true,
  bandPx = PINNED_BANNER_OFFSET_PX
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const ignoreSyncRef = useRef(false);
  const rafRef = useRef(0);
  const pinnedIdsKey = pinnedPosts.map((p) => p.id).join(',');

  useEffect(() => {
    setActiveIndex((i) =>
      pinnedPosts.length === 0 ? 0 : Math.min(i, pinnedPosts.length - 1)
    );
  }, [pinnedIdsKey, pinnedPosts.length]);

  const syncFromScroll = useCallback(() => {
    if (ignoreSyncRef.current) return;
    const container = containerRef.current;
    if (!container || pinnedPosts.length === 0) {
      setActiveIndex(0);
      return;
    }
    const next = computePinnedBannerIndex(
      pinnedPosts,
      cardRefs.current,
      container,
      bandPx
    );
    setActiveIndex((i) => (i === next ? i : next));
  }, [bandPx, cardRefs, containerRef, pinnedPosts]);

  useEffect(() => {
    if (!enabled) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const scheduleSync = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        syncFromScroll();
      });
    };

    syncFromScroll();
    container.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);
    return () => {
      container.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, pinnedIdsKey, syncFromScroll, containerRef]);

  const advance = useCallback(() => {
    setActiveIndex((i) =>
      pinnedPosts.length === 0 ? 0 : (i + 1) % pinnedPosts.length
    );
  }, [pinnedPosts.length]);

  const openPinned = useCallback(
    (post) => {
      if (!post?.id) return;
      const el = cardRefs.current.get(post.id);
      if (!el) return;

      const container = containerRef.current;
      ignoreSyncRef.current = true;

      let cleared = false;
      const clearLock = () => {
        if (cleared) return;
        cleared = true;
        ignoreSyncRef.current = false;
        syncFromScroll();
        container?.removeEventListener('scrollend', clearLock);
      };

      container?.addEventListener('scrollend', clearLock);
      window.setTimeout(clearLock, 900);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [cardRefs, containerRef, syncFromScroll]
  );

  return { activeIndex, advance, openPinned, syncFromScroll };
}
