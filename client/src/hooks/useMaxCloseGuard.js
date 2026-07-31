// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Перехват закрытия мини-приложения MAX.
 *
 * - BackButton → наш bottom sheet (`CloseAppConfirmSheet`)
 * - ✕ / свайп вниз / клик вне webview → `enableClosingConfirmation()` (нативный диалог MAX;
 *   кастомный UI для этих жестов SDK не отдаёт — события close-request нет)
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

  useEffect(() => {
    if (!enabled) return undefined;

    const webApp = /** @type {{
      ready?: () => void,
      enableClosingConfirmation?: () => void,
      disableClosingConfirmation?: () => void,
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
        // closing confirmation оставляем включённой до следующего mount —
        // при unmount всего App закрытие и так идёт через pagehide.
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
