// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import { closeTopOverlay } from '../lib/overlayStack';
import { isSectionScrollAtTop, scrollSectionToTop } from '../lib/sectionScroll';

/**
 * @param {Element | null} el
 * @returns {boolean}
 */
function isEditableFocus(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (tag === 'INPUT') {
      const type = /** @type {HTMLInputElement} */ (el).type;
      if (type === 'button' || type === 'submit' || type === 'reset' || type === 'checkbox' || type === 'radio' || type === 'file') {
        return false;
      }
    }
    return !/** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} */ (el).disabled;
  }
  return Boolean(el.closest('[contenteditable="true"]'));
}

/**
 * Перехват закрытия мини-приложения MAX.
 *
 * Системная «Назад» (приоритет):
 * 1) клавиатура (blur input/textarea/contenteditable)
 * 2) верхний оверлей (Modal / fullscreen / дропдаун / меню) — `overlayStack`
 * 3) на ленте / записи / магазине / турнир-ленте — scroll к верху раздела
 * 4) на прочих разделах — возврат в основную ленту
 * 5) иначе — bottom sheet подтверждения выхода
 *
 * ✕ / клик вне webview → `enableClosingConfirmation()` (нативный диалог MAX).
 * Кастомный свайп-закрытия нет (`disableVerticalSwipes`); pull-to-refresh — на страницах списков.
 *
 * @param {{
 *   enabled?: boolean,
 *   onBeforeClose?: () => void | Promise<void>,
 *   supportsScrollThenClose?: boolean,
 *   leaveSectionOnBack?: boolean,
 *   onLeaveSection?: () => void
 * }} [options]
 *
 * `supportsScrollThenClose` — лента / запись / магазин / турнир-лента (scroll↑ → sheet).
 * `leaveSectionOnBack` — профиль / галерея / админ / рейтинг → основная лента.
 */
export function useMaxCloseGuard({
  enabled = true,
  onBeforeClose,
  supportsScrollThenClose = true,
  leaveSectionOnBack = false,
  onLeaveSection
} = {}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const onBeforeCloseRef = useRef(onBeforeClose);
  onBeforeCloseRef.current = onBeforeClose;
  const onLeaveSectionRef = useRef(onLeaveSection);
  onLeaveSectionRef.current = onLeaveSection;
  const supportsScrollRef = useRef(supportsScrollThenClose);
  supportsScrollRef.current = supportsScrollThenClose;
  const leaveSectionRef = useRef(leaveSectionOnBack);
  leaveSectionRef.current = leaveSectionOnBack;
  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;

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

    setConfirmOpen(false);
    setConfirming(false);
  }, [confirming]);

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
      if (confirmingRef.current) return;

      // 1) Клавиатура
      const active = document.activeElement;
      if (isEditableFocus(active)) {
        /** @type {HTMLElement} */ (active).blur();
        return;
      }

      // 2) Оверлей / дочернее окно (в т.ч. sheet выхода — Modal в стеке)
      if (closeTopOverlay()) return;

      // 3) Scroll к верху на основных лентах
      if (supportsScrollRef.current && !isSectionScrollAtTop()) {
        scrollSectionToTop();
        return;
      }

      // 4) Вспомогательные разделы → основная лента
      if (leaveSectionRef.current) {
        onLeaveSectionRef.current?.();
        return;
      }

      // 5) Подтверждение выхода
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
      Promise.resolve(webApp.disableVerticalSwipes?.()).catch(() => {});
      try {
        webApp.BackButton.show?.();
        webApp.BackButton.onClick(handleBack);
      } catch {
        // ignore
      }
    }

    const handlePopState = () => {
      window.history.pushState({ closeGuard: 1 }, '');
      handleBack();
    };

    if (!usedBridge) {
      window.history.pushState({ closeGuard: 1 }, '');
      window.addEventListener('popstate', handlePopState);
    }

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
        Promise.resolve(webApp.enableVerticalSwipes?.()).catch(() => {});
      }
      if (!usedBridge) {
        window.removeEventListener('popstate', handlePopState);
      }
    };
  }, [enabled]);

  return {
    confirmOpen,
    confirming,
    requestCloseConfirm,
    cancelCloseConfirm,
    confirmCloseApp
  };
}
