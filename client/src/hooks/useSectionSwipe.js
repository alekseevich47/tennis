// @ts-check
import { useEffect, useRef } from 'react';
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
const ANIM_MS = 280;
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
  // Галерея вне цепочки — свайп на ней отключён.
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
 * Горизонтальный свайп между основными разделами BottomNav.
 * Порог коммита — ≥ 1/2 ширины экрана; на краях — rubber-band.
 *
 * @param {{
 *   enabled?: boolean,
 *   activeTab: number,
 *   showAdmin?: boolean,
 *   onTabChange: (tab: number) => void,
 *   containerRef: React.RefObject<HTMLElement | null>
 * }} options
 */
export function useSectionSwipe({
  enabled = true,
  activeTab,
  showAdmin = false,
  onTabChange,
  containerRef
}) {
  const activeTabRef = useRef(activeTab);
  const showAdminRef = useRef(showAdmin);
  const onTabChangeRef = useRef(onTabChange);
  const enabledRef = useRef(enabled);
  activeTabRef.current = activeTab;
  showAdminRef.current = showAdmin;
  onTabChangeRef.current = onTabChange;
  enabledRef.current = enabled;

  const gestureRef = useRef({
    mode: /** @type {'idle' | 'pending' | 'horizontal' | 'ignored'} */ ('idle'),
    startX: 0,
    startY: 0,
    offset: 0,
    animating: false
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const setOffset = (px, { animate = false } = {}) => {
      gestureRef.current.offset = px;
      if (animate) {
        node.classList.add('section-swipe--animating');
        node.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
      } else {
        node.classList.remove('section-swipe--animating');
        node.style.transition = 'none';
      }
      node.style.transform = px === 0 ? '' : `translate3d(${px}px, 0, 0)`;
    };

    const resetIdle = () => {
      gestureRef.current.mode = 'idle';
      gestureRef.current.animating = false;
      node.classList.remove('section-swipe--dragging', 'section-swipe--animating');
      setOffset(0, { animate: false });
    };

    const rubberOffset = (dx, atStart, atEnd) => {
      if ((atStart && dx > 0) || (atEnd && dx < 0)) {
        const capped = Math.sign(dx) * Math.min(Math.abs(dx) * EDGE_RESISTANCE, EDGE_MAX_PX);
        return capped;
      }
      return dx;
    };

    const canStart = () => {
      if (!enabledRef.current) return false;
      if (gestureRef.current.animating) return false;
      if (document.documentElement.classList.contains('onboarding-active')) return false;
      if (document.querySelector('.app.onboarding-active')) return false;
      if (isTextFieldFocused()) return false;
      if (hasBlockingOverlay(SWIPE_ALLOW_OVERLAY_SUFFIXES)) return false;
      const tabs = getSwipeableTabs(activeTabRef.current, showAdminRef.current);
      return tabs.includes(activeTabRef.current);
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
      gestureRef.current.startX = touch.clientX;
      gestureRef.current.startY = touch.clientY;
      gestureRef.current.offset = 0;
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

      if (g.mode === 'pending') {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
        if (Math.abs(dx) > Math.abs(dy) * AXIS_RATIO && Math.abs(dx) >= LOCK_PX) {
          g.mode = 'horizontal';
          node.classList.add('section-swipe--dragging');
        } else {
          g.mode = 'ignored';
          return;
        }
      }

      if (g.mode !== 'horizontal') return;
      if (event.cancelable) event.preventDefault();
      setOffset(rubberOffset(dx, atStart, atEnd), { animate: false });
    };

    /**
     * @param {number} targetX
     * @param {() => void} [done]
     */
    const animateTo = (targetX, done) => {
      gestureRef.current.animating = true;
      setOffset(targetX, { animate: true });
      window.setTimeout(() => {
        done?.();
      }, ANIM_MS);
    };

    const finishCommit = (direction) => {
      const tabs = getSwipeableTabs(activeTabRef.current, showAdminRef.current);
      const idx = tabs.indexOf(activeTabRef.current);
      const nextIdx = idx + direction;
      if (idx < 0 || nextIdx < 0 || nextIdx >= tabs.length) {
        animateTo(0, resetIdle);
        return;
      }

      const width = getWindowWidth();
      const exitX = direction < 0 ? -width : width;
      const enterX = direction < 0 ? width : -width;
      const nextTab = tabs[nextIdx];

      animateTo(exitX, () => {
        onTabChangeRef.current(nextTab);
        setOffset(enterX, { animate: false });
        // Двойной rAF: дождаться paint новой вкладки перед въездом.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setOffset(0, { animate: true });
            window.setTimeout(resetIdle, ANIM_MS);
          });
        });
      });
    };

    const onTouchEnd = (event) => {
      const g = gestureRef.current;
      if (g.mode !== 'horizontal' || g.animating) {
        if (g.mode !== 'idle') g.mode = 'idle';
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        resetIdle();
        return;
      }

      const dx = touch.clientX - g.startX;
      const tabs = getSwipeableTabs(activeTabRef.current, showAdminRef.current);
      const idx = tabs.indexOf(activeTabRef.current);
      const atStart = idx <= 0;
      const atEnd = idx < 0 || idx >= tabs.length - 1;
      const width = getWindowWidth();
      const threshold = width * COMMIT_RATIO;
      const applied = rubberOffset(dx, atStart, atEnd);

      // Край: всегда пружина назад, без смены таба.
      if ((atStart && dx > 0) || (atEnd && dx < 0)) {
        animateTo(0, resetIdle);
        return;
      }

      if (Math.abs(applied) >= threshold) {
        finishCommit(dx < 0 ? 1 : -1);
        return;
      }

      animateTo(0, resetIdle);
    };

    const onTouchCancel = () => {
      if (gestureRef.current.mode === 'horizontal' && !gestureRef.current.animating) {
        animateTo(0, resetIdle);
        return;
      }
      gestureRef.current.mode = 'idle';
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchCancel);

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchCancel);
      resetIdle();
    };
  }, [containerRef]);
}
