import { MAX_APP_ID, TG_SELLER_URL } from '../../config';
import { getWebApp, isMobilePlatform, isTelegramApp } from '../../lib/messengerBridge';
import { requestOpenMaxUserChat } from '../../services/auth';

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
 * Mention-диплинк (docs-api). В Mini App WebView не открывается — только в нативном чате бота.
 * @param {string | number | null | undefined} maxId
 * @returns {string}
 */
export function buildMaxUserChatUrl(maxId) {
  const id = String(maxId ?? '').trim();
  return id ? `max://user/${id}` : '';
}

/** Чат с ботом мини-приложения (https — для openMaxLink). */
export function buildMaxBotChatUrl() {
  const bot = String(MAX_APP_ID || '').trim();
  return bot ? `https://max.ru/${bot}` : '';
}

/**
 * https://max.ru/… → openMaxLink. max:// из WebView не открывать (Bridge/браузер глушат).
 * @param {string} url
 */
export function openMaxDeepLink(url) {
  const href = String(url || '').trim();
  if (!href) return;
  if (/^max:\/\//i.test(href)) return;
  if (isTelegramApp() && !/^https?:\/\//i.test(href)) return;

  const webApp = getWebApp();
  if (/^https?:\/\/(www\.)?max\.ru\//i.test(href) && webApp?.openMaxLink) {
    webApp.openMaxLink(href);
    return;
  }
  if (webApp?.openLink) {
    webApp.openLink(href);
    return;
  }
  window.open(href, '_blank', 'noopener,noreferrer');
}

/**
 * Личный чат с игроком по max_id: бот шлёт mention модератору, затем openMaxLink на бота.
 * WebView не умеет max:// (Network: provisional headers / «Ссылка устарела»).
 * @param {string | number | null | undefined} maxId
 * @param {string} [_displayName] зарезервировано; имя берёт сервер из users.full_name
 * @param {{ targetUserId: string }} opts PocketBase id профиля игрока
 * @returns {Promise<void>}
 */
export async function openMaxUserChat(maxId, _displayName, opts) {
  const targetUserId = String(opts?.targetUserId || '').trim();
  if (!targetUserId) {
    throw new Error('Не указан профиль игрока');
  }
  if (isTelegramApp()) {
    throw new Error('Открытие чата MAX недоступно в Telegram');
  }
  if (!String(maxId ?? '').trim()) {
    throw new Error('У игрока нет max_id');
  }

  await requestOpenMaxUserChat(targetUserId);

  const botUrl = buildMaxBotChatUrl();
  if (!botUrl) {
    throw new Error('Не задан MAX_APP_ID бота');
  }
  // Тот же путь, что «Связаться» / продавец — https://max.ru/… через openMaxLink.
  openSellerChat(botUrl);
}

export { BUY_TOAST_TEXT, BUY_MOBILE_TOAST_ACTION_LABEL };
