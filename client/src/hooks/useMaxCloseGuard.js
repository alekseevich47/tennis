// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import { SWIPE_CLOSE_THRESHOLD } from '../lib/gestures';

const PULL_DEADZONE = 12;
const PULL_MAX = 180;
const PULL_SPRING_MS = 220;

/**
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
function isScrollChainAtTop(target) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    const canScroll =
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1;
    if (canScroll && node.scrollTop > 1) return false;
    node = node.parentElement;
  }
  return (document.documentElement.scrollTop || document.body.scrollTop || 0) <= 1;
}

/** Не перехватывать pull, если жест внутри модалки / fullscreen / дропдауна. */
function shouldSkipAppPull(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        '.ui-modal-overlay',
        '.ui-modal',
        '.avatar-crop-overlay',
        '.fullscreen-overlay',
        '.notifications-dropdown',
        '.onboarding-card',
        '.onboarding-tooltip',
        '.onboarding-header-banner',
        '.post-context-menu'
      ].join(',')
    )
  );
}

/**
 * Перехват закрытия мини-приложения MAX.
 *
 * - BackButton → наш bottom sheet (`CloseAppConfirmSheet`)
 * - ✕ / клик вне webview → `enableClosingConfirmation()` (нативный диалог MAX)
 * - Свайп вниз по контенту → `disableVerticalSwipes()` (нативный же слишком ранний) +
 *   свой pull-жест: закрытие только по позиции пальца при отпускании (≥ порога),
 *   возврат пальца вверх отменяет. Header-swipe MAX всё ещё может закрывать (SDK).
 * - Вне MAX (локальная разработка) — `history` + `popstate` для кнопки «Назад» браузера
 *
 * @param {{
 *   enabled?: boolean,
 *   onBeforeClose?: () => void | Promise<void>
 * }} [options]
 * @returns {{
 *   confirmOpen: boolean,
 *   confirming: boolean,
 *   requestCloseConfirm: () => void,
 *   cancelCloseConfirm: () => void,
 *   confirmCloseApp: () => Promise<void>
 * }}
 */
export function useMaxCloseGuard({ enabled = true, onBeforeClose } = {}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const onBeforeCloseRef = useRef(onBeforeClose);
  onBeforeCloseRef.current = onBeforeClose;
  const confirmOpenRef = useRef(false);
  confirmOpenRef.current = confirmOpen;
  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;
  const pullGestureRef = useRef(/** @type {null | {
    startY: number,
    startX: number,
    offsetY: number,
    active: boolean,
    isHorizontal: boolean,
    blocked: boolean
  }} */ (null));
  const pullElRef = useRef(/** @type {HTMLElement | null} */ (null));

  const requestCloseConfirm = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const cancelCloseConfirm = useCallback(() => {
    if (confirming) return;
    setConfirmOpen(false);
  }, [confirming]);

  const confirmCloseApp = useCallback(async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await onBeforeCloseRef.current?.();
    } catch {
      // flush ошибок не блокирует закрытие
    }

    const webApp = /** @type {{ disableClosingConfirmation?: () => void, close?: () => void } | undefined} */ (
      window.WebApp
    );
    try {
      webApp?.disableClosingConfirmation?.();
    } catch {
      // ignore
    }
    try {
      webApp?.close?.();
    } catch {
      // ignore
    }

    // Вне MAX close() no-op — просто закрываем sheet.
    setConfirmOpen(false);
    setConfirming(false);
  }, [confirming]);

  const clearPullTransform = useCallback((withTransition) => {
    const el = pullElRef.current;
    if (!el) return;
    if (withTransition) {
      el.style.transition = `transform ${PULL_SPRING_MS}ms ease`;
      el.style.transform = 'translate3d(0,0,0)';
      window.setTimeout(() => {
        if (pullGestureRef.current) return;
        el.style.transition = '';
        el.style.transform = '';
      }, PULL_SPRING_MS);
    } else {
      el.style.transition = '';
      el.style.transform = '';
    }
  }, []);

  const applyPullTransform = useCallback((offsetY) => {
    const el = pullElRef.current || document.querySelector('.app');
    if (!(el instanceof HTMLElement)) return;
    pullElRef.current = el;
    el.style.transition = 'none';
    el.style.transform = `translate3d(0,${offsetY}px,0)`;
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const webApp = /** @type {{
      ready?: () => void,
      enableClosingConfirmation?: () => void,
      disableClosingConfirmation?: () => void,
      enableVerticalSwipes?: () => void,
      disableVerticalSwipes?: () => void,
      BackButton?: {
        show?: () => void,
        hide?: () => void,
        onClick?: (cb: () => void) => void,
        offClick?: (cb: () => void) => void
      }
    } | undefined} */ (window.WebApp);

    const handleBack = () => {
      if (confirmOpenRef.current) {
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(true);
    };

    let usedBridge = false;

    if (webApp?.BackButton?.onClick) {
      usedBridge = true;
      try {
        webApp.ready?.();
      } catch {
        // ignore
      }
      try {
        webApp.enableClosingConfirmation?.();
      } catch {
        // ignore
      }
      // Нативный vertical-swipe закрывает слишком рано (по пику, не по отпусканию) —
      // отключаем и ведём свой pull с commit по финальной позиции пальца.
      try {
        webApp.disableVerticalSwipes?.();
      } catch {
        // ignore
      }
      try {
        webApp.BackButton.show?.();
        webApp.BackButton.onClick(handleBack);
      } catch {
        // ignore
      }
    }

    /** Fallback для локального запуска вне MAX. */
    const handlePopState = () => {
      window.history.pushState({ closeGuard: 1 }, '');
      handleBack();
    };

    if (!usedBridge) {
      window.history.pushState({ closeGuard: 1 }, '');
      window.addEventListener('popstate', handlePopState);
    }

    const handleTouchStart = (/** @type {TouchEvent} */ event) => {
      if (confirmOpenRef.current || confirmingRef.current) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const blocked = shouldSkipAppPull(event.target) || !isScrollChainAtTop(event.target);
      pullGestureRef.current = {
        startY: touch.clientY,
        startX: touch.clientX,
        offsetY: 0,
        active: false,
        isHorizontal: false,
        blocked
      };
    };

    const handleTouchMove = (/** @type {TouchEvent} */ event) => {
      const gesture = pullGestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch || confirmOpenRef.current || confirmingRef.current) return;
      if (gesture.blocked || gesture.isHorizontal) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (!gesture.active) {
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          gesture.isHorizontal = true;
          return;
        }
        if (deltaY < PULL_DEADZONE) return;
        // Тяга вниз только если цепочка скролла всё ещё наверху
        if (!isScrollChainAtTop(event.target)) {
          gesture.blocked = true;
          return;
        }
        gesture.active = true;
      }

      // Rubber-band: сопротивление после порога
      const raw = Math.max(0, deltaY);
      const offsetY = raw <= PULL_MAX ? raw : PULL_MAX + (raw - PULL_MAX) * 0.25;
      gesture.offsetY = offsetY;
      applyPullTransform(offsetY);

      if (event.cancelable) event.preventDefault();
    };

    const handleTouchEnd = (/** @type {TouchEvent} */ event) => {
      const gesture = pullGestureRef.current;
      pullGestureRef.current = null;
      if (!gesture) return;

      if (gesture.blocked || gesture.isHorizontal || !gesture.active) {
        if (gesture.active) clearPullTransform(true);
        return;
      }

      // Финальная точка пальца (не пик свайпа) — как CommentSwipeReply
      const touch = event.changedTouches?.[0];
      let offsetY = gesture.offsetY;
      if (touch) {
        offsetY = Math.max(0, touch.clientY - gesture.startY);
      }

      if (offsetY >= SWIPE_CLOSE_THRESHOLD) {
        clearPullTransform(false);
        setConfirmOpen(true);
        return;
      }

      clearPullTransform(true);
    };

    // passive:false на move — нужен preventDefault при активном pull
    window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true, capture: true });

    return () => {
      if (usedBridge && webApp?.BackButton) {
        try {
          webApp.BackButton.offClick?.(handleBack);
        } catch {
          // ignore
        }
        try {
          webApp.BackButton.hide?.();
        } catch {
          // ignore
        }
        try {
          webApp.enableVerticalSwipes?.();
        } catch {
          // ignore
        }
        // closing confirmation оставляем включённой до следующего mount —
        // при unmount всего App закрытие и так идёт через pagehide.
      }
      if (!usedBridge) {
        window.removeEventListener('popstate', handlePopState);
      }
      window.removeEventListener('touchstart', handleTouchStart, true);
      window.removeEventListener('touchmove', handleTouchMove, true);
      window.removeEventListener('touchend', handleTouchEnd, true);
      window.removeEventListener('touchcancel', handleTouchEnd, true);
      clearPullTransform(false);
    };
  }, [enabled, applyPullTransform, clearPullTransform]);

  // Сброс pull-transform при открытии sheet
  useEffect(() => {
    if (confirmOpen) clearPullTransform(false);
  }, [confirmOpen, clearPullTransform]);

  return {
    confirmOpen,
    confirming,
    requestCloseConfirm,
    cancelCloseConfirm,
    confirmCloseApp
  };
}
