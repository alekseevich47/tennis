import { TG_SELLER_URL } from '../../config';
import { getWebApp, isMobilePlatform, isTelegramApp } from '../../lib/messengerBridge';

const BUY_TOAST_TEXT =
  'Текст о товаре сохранён в буфер обмена. Вставьте его в чат к администратору.';

const BUY_MOBILE_TOAST_ACTION_LABEL = 'Перейти в чат';

/**
 * @param {import('../../services/catalog').ProductRecord} product
 */
function formatProductLine(product) {
  const title = String(product?.title || 'товар').trim();
  const id = String(product?.id || '').trim();
  return `"${title}" #${id}`;
}

/**
 * @param {import('../../services/catalog').ProductRecord[]} products
 */
export function buildBuyMessage(products) {
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  if (list.length === 0) return '';

  if (list.length === 1) {
    return `Здравствуйте. Хочу узнать о ${formatProductLine(list[0])}`;
  }

  const lines = list.map((product, index) => `${index + 1}. ${formatProductLine(product)}`);
  return `Здравствуйте. Хочу узнать о:\n${lines.join('\n')}`;
}

/**
 * Мобильный клиент мессенджера (MAX или Telegram). Имя сохранено для обратной совместимости.
 * @returns {boolean}
 */
export function isMobileMaxPlatform() {
  return isMobilePlatform();
}

/**
 * Telegram Mini App: чат продавца в Telegram (`VITE_TG_SELLER_URL`), иначе — ссылка MAX наружу.
 * @param {string} maxUrl
 * @returns {boolean} true — обработано
 */
function openSellerChatInTelegram(maxUrl) {
  const webApp = getWebApp();
  if (TG_SELLER_URL && webApp?.openTelegramLink) {
    webApp.openTelegramLink(TG_SELLER_URL);
    return true;
  }
  const target = String(maxUrl || '').trim();
  if (!target) return true;
  if (webApp?.openLink) {
    webApp.openLink(target);
    return true;
  }
  window.open(target, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * @param {string} url
 */
export function openSellerChat(url) {
  if (isTelegramApp()) {
    openSellerChatInTelegram(url);
    return;
  }

  const webApp = getWebApp();
  const target = String(url || '').trim();
  if (!target) return;

  const isMaxHost =
    /^https?:\/\/(www\.)?max\.ru\//i.test(target) || target.startsWith('max://');

  const openChat = () => {
    // Чат продавца/модератора: в Mini App всегда openMaxLink для max.ru / max:// —
    // openLink может открыть не тот чат в контексте бота.
    if (isMaxHost && webApp?.openMaxLink) {
      webApp.openMaxLink(target);
      return;
    }

    if (webApp?.openLink) {
      webApp.openLink(target);
      return;
    }

    window.open(target, '_blank');
  };

  // Desktop/web: openMaxLink может мгновенно триггерить нативный close-confirm.
  // Кратко глушим его, чат оставляем в фоне, затем снова включаем подтверждение ✕.
  if (!isMobileMaxPlatform() && webApp?.disableClosingConfirmation) {
    try {
      webApp.disableClosingConfirmation();
    } catch {
      // ignore
    }
    openChat();
    window.setTimeout(() => {
      try {
        webApp.enableClosingConfirmation?.();
      } catch {
        // ignore
      }
    }, 1200);
    return;
  }

  openChat();
}

/**
 * Диплинк личного чата в MAX по user_id (dev.max.ru/docs-api — max://user/user_id).
 * @param {string | number | null | undefined} maxId
 * @returns {string}
 */
export function buildMaxUserChatUrl(maxId) {
  const id = String(maxId ?? '').trim();
  return id ? `max://user/${id}` : '';
}

/**
 * @param {string} url
 */
export function openMaxDeepLink(url) {
  const href = String(url || '').trim();
  // Telegram SDK openLink принимает только https — max:// бросает ошибку.
  if (isTelegramApp() && /^max:\/\//i.test(href)) return;
  const webApp = getWebApp();
  if (webApp?.openMaxLink) {
    webApp.openMaxLink(href);
    return;
  }
  if (webApp?.openLink) {
    webApp.openLink(href);
  }
}

/**
 * @param {string | number | null | undefined} maxId
 */
export function openMaxUserChat(maxId) {
  const url = buildMaxUserChatUrl(maxId);
  if (url) openMaxDeepLink(url);
}

export { BUY_TOAST_TEXT, BUY_MOBILE_TOAST_ACTION_LABEL };
