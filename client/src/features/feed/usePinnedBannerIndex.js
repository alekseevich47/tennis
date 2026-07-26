import { useCallback, useEffect, useRef, useState } from 'react';

/** Высота sticky-плашки — линия «прохождения» и scroll-margin. */
export const PINNED_BANNER_OFFSET_PX = 72;

/** Подсветка карточки после клика по плашке закрепа. */
export const PIN_FOCUS_HIGHLIGHT_MS = 1500;
export const PIN_FOCUS_HIGHLIGHT_CLASS = 'feed-card--pin-focus';

/** @type {WeakMap<HTMLElement, number>} */
const pinHighlightTimers = new WeakMap();

/**
 * Светло-синяя подсветка карточки на PIN_FOCUS_HIGHLIGHT_MS после фокуса.
 * @param {HTMLElement} el
 */
export function applyPinFocusHighlight(el) {
  if (!el) return;
  const prev = pinHighlightTimers.get(el);
  if (prev) window.clearTimeout(prev);
  el.classList.add(PIN_FOCUS_HIGHLIGHT_CLASS);
  const t = window.setTimeout(() => {
    el.classList.remove(PIN_FOCUS_HIGHLIGHT_CLASS);
    pinHighlightTimers.delete(el);
  }, PIN_FOCUS_HIGHLIGHT_MS);
  pinHighlightTimers.set(el, t);
}

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
  /** Индекс, который держим после клика по плашке (не даём sync откатить). */
  const lockedIndexRef = useRef(/** @type {number | null} */ (null));
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
      if (ignoreSyncRef.current) return;
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        syncFromScroll();
      });
    };

    // После инерции/резкого скролла гарантируем финальный sync (иначе rAF мог
    // посчитать позиции «между» кадрами и плашка остаётся на устаревшем индексе).
    const syncSettled = () => {
      if (ignoreSyncRef.current) return;
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      syncFromScroll();
    };

    syncFromScroll();
    container.addEventListener('scroll', scheduleSync, { passive: true });
    container.addEventListener('scrollend', syncSettled);
    window.addEventListener('resize', scheduleSync);
    return () => {
      container.removeEventListener('scroll', scheduleSync);
      container.removeEventListener('scrollend', syncSettled);
      window.removeEventListener('resize', scheduleSync);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, pinnedIdsKey, syncFromScroll, containerRef]);

  const advance = useCallback(() => {
    setActiveIndex((i) => {
      const next =
        pinnedPosts.length === 0 ? 0 : (i + 1) % pinnedPosts.length;
      if (ignoreSyncRef.current) {
        lockedIndexRef.current = next;
      }
      return next;
    });
  }, [pinnedPosts.length]);

  const openPinned = useCallback(
    (post) => {
      if (!post?.id) return;
      const el = cardRefs.current.get(post.id);
      if (!el) return;

      const container = containerRef.current;
      const openedIndex = pinnedPosts.findIndex((p) => p.id === post.id);
      const nextIndex =
        openedIndex >= 0 && pinnedPosts.length > 0
          ? (openedIndex + 1) % pinnedPosts.length
          : 0;

      // Блокируем sync до конца программного скролла и фиксируем «следующий»
      // индекс — иначе clearLock→syncFromScroll откатывает плашку назад,
      // если карточка ещё не пересекла sticky-линию (почти нулевой скролл).
      ignoreSyncRef.current = true;
      lockedIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      let cleared = false;
      const clearLock = () => {
        if (cleared) return;
        cleared = true;
        const keep = lockedIndexRef.current;
        ignoreSyncRef.current = false;
        lockedIndexRef.current = null;
        if (keep != null) {
          setActiveIndex(keep);
        }
        container?.removeEventListener('scrollend', clearLock);
        // Подсветка после фокуса (конец программного скролла / fallback 900ms).
        applyPinFocusHighlight(el);
      };

      container?.addEventListener('scrollend', clearLock);
      window.setTimeout(clearLock, 900);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [cardRefs, containerRef, pinnedPosts]
  );

  return { activeIndex, advance, openPinned, syncFromScroll };
}
