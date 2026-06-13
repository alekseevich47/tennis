const BUY_REDIRECT_DELAY_MS = 3000;

const BUY_REDIRECT_TOAST_TEXT =
  'Сейчас вы будете перенаправлены в чат к администратору. Вставьте в чат автоматически сохраненный текст о выбранном товаре.';

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

export { BUY_REDIRECT_DELAY_MS, BUY_REDIRECT_TOAST_TEXT };
