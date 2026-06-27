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
 * @returns {boolean}
 */
export function isMobileMaxPlatform() {
  const platform = window.WebApp?.platform;
  return platform === 'ios' || platform === 'android';
}

/**
 * @param {string} url
 */
export function openSellerChat(url) {
  const webApp = window.WebApp;

  if (isMobileMaxPlatform() && webApp?.openMaxLink) {
    webApp.openMaxLink(url);
    return;
  }

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.open(url, '_blank');
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
 * @param {string | number | null | undefined} maxId
 */
export function openMaxUserChat(maxId) {
  const url = buildMaxUserChatUrl(maxId);
  if (url) openSellerChat(url);
}

export { BUY_TOAST_TEXT, BUY_MOBILE_TOAST_ACTION_LABEL };
