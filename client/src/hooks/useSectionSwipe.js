// @ts-check
import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { hasBlockingOverlay } from '../lib/overlayStack';
import {
  ADMIN_TAB_INDEX,
  GALLERY_TAB_INDEX,
  PROFILE_TAB_INDEX
} from '../components/BottomNav';

const LOCK_PX = 14;
const AXIS_RATIO = 1.4;
const COMMIT_RATIO = 0.5;
const EDGE_MAX_PX = 72;
const EDGE_RESISTANCE = 0.28;
const ANIM_MS = 300;
const SWIPE_ALLOW_OVERLAY_SUFFIXES = [
  ':favorites',
  ':notifications',
  ':header-search',
  ':shop-category',
  ':shop-search'
];

const IGNORE_SELECTOR = [
  '[data-section-swipe-ignore]',
  '.telegram-post-media-grid--album',
  '.product-card-image-btn',
  '.product-image',
  '.comment-swipe',
  '.comment-reply-compose-bar',
  '.rdp-root',
  '.bottom-nav',
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]'
].join(', ');

/**
 * @param {number} activeTab
 * @param {boolean} showAdmin
 * @returns {number[]}
 */
export function getSwipeableTabs(activeTab, showAdmin) {
  const tabs = [0, 1, 2, 3, PROFILE_TAB_INDEX];
  if (showAdmin) tabs.push(ADMIN_TAB_INDEX);
  if (activeTab === GALLERY_TAB_INDEX) return [];
  return tabs;
}

function isTextFieldFocused() {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) return true;
  return Boolean(target.closest(IGNORE_SELECTOR));
}

function getWindowWidth() {
  return window.innerWidth || document.documentElement.clientWidth || 360;
}

/**
 * Пейджер разделов: во время жеста виден соседний экран.
 * Transform только на `.section-swipe-track` (не на `main`) — иначе stacking
 * context прячет модалки/fullscreen под BottomNav.
 *
 * @param {{
 *   enabled?: boolean,
 *   activeTab: number,
 *   showAdmin?: boolean,
 *   onTabChange: (tab: number) => void,
 *   viewportRef: React.RefObject<HTMLElement | null>,
 *   trackRef: React.RefObject<HTMLElement | null>,
 *   onPeekChange: (peek: { tab: number, direction: -1 | 1 } | null) => void
 * }} options
 */
export function useSectionSwipe({
  enabled = true,
  activeTab,
  showAdmin = false,
  onTabChange,
  viewportRef,
  trackRef,
  onPeekChange
}) {
  const activeTabRef = useRef(activeTab);
  const showAdminRef = useRef(showAdmin);
  const onTabChangeRef = useRef(onTabChange);
  const onPeekChangeRef = useRef(onPeekChange);
  const enabledRef = useRef(enabled);
  activeTabRef.current = activeTab;
  showAdminRef.current = showAdmin;
  onTabChangeRef.current = onTabChange;
  onPeekChangeRef.current = onPeekChange;
  enabledRef.current = enabled;

  const gestureRef = useRef({
    mode: /** @type {'idle' | 'pending' | 'horizontal' | 'edge' | 'ignored'} */ ('idle'),
    startX: 0,
    startY: 0,
    /** @type {-1 | 1 | 0} */
    direction: 0,
    animating: false
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return undefined;

    const setTrackX = (px, { animate = false } = {}) => {
      if (animate) {
        track.classList.add('section-swipe-track--animating');
        track.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
      } else {
        track.classList.remove('section-swipe-track--animating');
        track.style.transition = 'none';
      }
      track.style.transform = px === 0 ? 'none' : `translate3d(${px}px, 0, 0)`;
    };

    const clearPeek = () => {
      onPeekChangeRef.current(null);
      viewport.classList.remove('section-swipe-viewport--dragging');
      track.classList.remove(
        'section-swipe-track--animating',
        'section-swipe-track--dragging'
      );
      setTrackX(0, { animate: false });
    };

    const resetIdle = () => {
      gestureRef.current.mode = 'idle';
      gestureRef.current.direction = 0;
      gestureRef.current.animating = false;
      clearPeek();
    };

    const canStart = () => {
      if (!enabledRef.current) return false;
      if (gestureRef.current.animating) return false;
      if (document.querySelector('.app.onboarding-active')) return false;
      if (isTextFieldFocused()) return false;
      if (hasBlockingOverlay(SWIPE_ALLOW_OVERLAY_SUFFIXES)) return false;
      const tabs = getSwipeableTabs(activeTabRef.current, showAdminRef.current);
      return tabs.includes(activeTabRef.current);
    };

    /**
     * @param {number} targetX
     * @param {() => void} [done]
     */
    const animateTo = (targetX, done) => {
      gestureRef.current.animating = true;
      setTrackX(targetX, { animate: true });
      window.setTimeout(() => {
        done?.();
      }, ANIM_MS);
    };

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) {
        gestureRef.current.mode = 'ignored';
        return;
      }
      if (!canStart() || shouldIgnoreTarget(event.target)) {
        gestureRef.current.mode = 'ignored';
        return;
      }
      const touch = event.touches[0];
      gestureRef.current.mode = 'pending';
      gestureRef.current.direction = 0;
      gestureRef.current.startX = touch.clientX;
      gestureRef.current.startY = touch.clientY;
    };

    const onTouchMove = (event) => {
      const g = gestureRef.current;
      if (g.mode === 'ignored' || g.mode === 'idle' || g.animating) return;
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;
      const tabs = getSwipeableTabs(activeTabRef.current, showAdminRef.current);
      const idx = tabs.indexOf(activeTabRef.current);
      const atStart = idx <= 0;
      const atEnd = idx < 0 || idx >= tabs.length - 1;
      const width = getWindowWidth();

      if (g.mode === 'pending') {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
        if (!(Math.abs(dx) > Math.abs(dy) * AXIS_RATIO && Math.abs(dx) >= LOCK_PX)) {
          g.mode = 'ignored';
          return;
        }

        // Свайп влево (dx<0) → следующий; вправо → предыдущий.
        if (dx < 0 && atEnd) {
          g.mode = 'edge';
        } else if (dx > 0 && atStart) {
          g.mode = 'edge';
        } else if (dx < 0) {
          g.mode = 'horizontal';
          g.direction = 1;
          onPeekChangeRef.current({ tab: tabs[idx + 1], direction: 1 });
          track.classList.add('section-swipe-track--dragging');
          viewport.classList.add('section-swipe-viewport--dragging');
          setTrackX(0, { animate: false });
        } else {
          // Вправо → [prev][current]. Нельзя ставить translate(-width), пока в track
          // только current: панель уезжает влево и виден белый фон viewport.
          // flushSync монтирует prev + App useLayoutEffect выставляет -width до paint.
          g.mode = 'horizontal';
          g.direction = -1;
          track.classList.add('section-swipe-track--dragging');
          viewport.classList.add('section-swipe-viewport--dragging');
          flushSync(() => {
            onPeekChangeRef.current({ tab: tabs[idx - 1], direction: -1 });
          });
        }
      }

      if (g.mode === 'edge') {
        if (event.cancelable) event.preventDefault();
        const capped =
          Math.sign(dx) * Math.min(Math.abs(dx) * EDGE_RESISTANCE, EDGE_MAX_PX);
        setTrackX(capped, { animate: false });
        return;
      }

      if (g.mode !== 'horizontal') return;
      if (event.cancelable) event.preventDefault();

      if (g.direction === 1) {
        // [current][next], dx ≤ 0
        setTrackX(Math.min(0, dx), { animate: false });
      } else {
        // [prev][current], стартовали с -width, dx ≥ 0
        setTrackX(Math.min(0, -width + Math.max(0, dx)), { animate: false });
      }
    };

    const onTouchEnd = (event) => {
      const g = gestureRef.current;
      if (g.animating) return;

      if (g.mode === 'edge') {
        animateTo(0, resetIdle);
        return;
      }

      if (g.mode !== 'horizontal') {
        if (g.mode !== 'idle') g.mode = 'idle';
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        resetIdle();
        return;
      }

      const dx = touch.clientX - g.startX;
      const width = getWindowWidth();
      const threshold = width * COMMIT_RATIO;
      const direction = g.direction;
      const tabs = getSwipeableTabs(activeTabRef.current, showAdminRef.current);
      const idx = tabs.indexOf(activeTabRef.current);
      const nextTab =
        direction === 1 ? tabs[idx + 1] : direction === -1 ? tabs[idx - 1] : null;

      const traveled =
        direction === 1 ? Math.max(0, -dx) : Math.max(0, dx);
      const commit = Boolean(nextTab != null && traveled >= threshold);

      if (commit && nextTab != null) {
        const settleX = direction === 1 ? -width : 0;
        animateTo(settleX, () => {
          onTabChangeRef.current(nextTab);
          // После смены таба peeks снимаем без обратного «пружинного» въезда.
          gestureRef.current.animating = false;
          gestureRef.current.mode = 'idle';
          gestureRef.current.direction = 0;
          onPeekChangeRef.current(null);
          viewport.classList.remove('section-swipe-viewport--dragging');
          track.classList.remove(
            'section-swipe-track--animating',
            'section-swipe-track--dragging'
          );
          setTrackX(0, { animate: false });
        });
        return;
      }

      // Отмена: вернуться к current (0 для next-peek, -width для prev-peek).
      const cancelX = direction === -1 ? -width : 0;
      animateTo(cancelX, resetIdle);
    };

    const onTouchCancel = () => {
      const g = gestureRef.current;
      if (g.animating) return;
      if (g.mode === 'edge') {
        animateTo(0, resetIdle);
        return;
      }
      if (g.mode === 'horizontal') {
        const width = getWindowWidth();
        const cancelX = g.direction === -1 ? -width : 0;
        animateTo(cancelX, resetIdle);
        return;
      }
      g.mode = 'idle';
    };

    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);
    viewport.addEventListener('touchcancel', onTouchCancel);

    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchCancel);
      resetIdle();
    };
  }, [viewportRef, trackRef]);
}
