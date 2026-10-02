// @ts-check
// Единая точка доступа к SDK мессенджера (MAX Bridge / Telegram Mini Apps).
// API почти совпадает (ready, close, BackButton, enable/disableClosingConfirmation,
// disableVerticalSwipes, openLink, platform, initData) — компоненты работают через getMessenger().

/** @typedef {'telegram' | 'max' | null} MessengerKind */

/**
 * @typedef {{
 *   initData?: string,
 *   platform?: string,
 *   ready?: () => void,
 *   expand?: () => void,
 *   close?: () => void,
 *   enableClosingConfirmation?: () => void,
 *   disableClosingConfirmation?: () => void,
 *   enableVerticalSwipes?: () => void,
 *   disableVerticalSwipes?: () => void,
 *   openLink?: (url: string) => void,
 *   openMaxLink?: (url: string) => void,
 *   openTelegramLink?: (url: string) => void,
 *   requestWriteAccess?: (cb?: (granted: boolean) => void) => void,
 *   initDataUnsafe?: { user?: { allows_write_to_pm?: boolean } },
 *   BackButton?: {
 *     show?: () => void,
 *     hide?: () => void,
 *     onClick?: (cb: () => void) => void,
 *     offClick?: (cb: () => void) => void
 *   }
 * }} MessengerWebApp
 */

/**
 * @returns {MessengerWebApp | undefined}
 */
function getTelegramWebApp() {
  const tg = /** @type {{ Telegram?: { WebApp?: MessengerWebApp } }} */ (/** @type {unknown} */ (window))
    .Telegram?.WebApp;
  if (!tg) return undefined;
  // SDK Telegram подключён всегда; вне Telegram initData пуст и platform === 'unknown'.
  if (tg.initData || (tg.platform && tg.platform !== 'unknown')) return tg;
  return undefined;
}

/**
 * @returns {{ kind: MessengerKind, webApp: MessengerWebApp | undefined }}
 */
export function getMessenger() {
  if (typeof window === 'undefined') return { kind: null, webApp: undefined };
  const tg = getTelegramWebApp();
  if (tg) return { kind: 'telegram', webApp: tg };
  const max = /** @type {MessengerWebApp | undefined} */ (
    /** @type {{ WebApp?: MessengerWebApp }} */ (/** @type {unknown} */ (window)).WebApp
  );
  if (max) return { kind: 'max', webApp: max };
  return { kind: null, webApp: undefined };
}

/** @returns {MessengerWebApp | undefined} */
export function getWebApp() {
  return getMessenger().webApp;
}

/** @returns {boolean} */
export function isTelegramApp() {
  return getMessenger().kind === 'telegram';
}

/**
 * Мобильный клиент мессенджера (MAX и Telegram используют 'ios' / 'android').
 * @returns {boolean}
 */
export function isMobilePlatform() {
  const platform = getWebApp()?.platform;
  return platform === 'ios' || platform === 'android';
}

/**
 * Внешняя ссылка через SDK (в webview `window.open` часто заблокирован).
 * @param {string} url
 */
export function openExternalLink(url) {
  const webApp = getWebApp();
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
