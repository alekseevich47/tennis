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

export { BUY_TOAST_TEXT, BUY_MOBILE_TOAST_ACTION_LABEL };
