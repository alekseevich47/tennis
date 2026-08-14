// @ts-check
// Конфигурация подключения к PocketBase и MAX SDK.

/**
 * Базовый URL API.
 * На проде (app.milenkih-team.ru) никогда не уходим на urban42 — даже если
 * в client/.env при сборке остался старый VITE_POCKETBASE_URL.
 * @returns {string}
 */
function resolvePbUrl() {
  const fromEnv = import.meta.env.VITE_POCKETBASE_URL || '';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';

  if (origin.includes('milenkih-team.ru')) {
    if (!fromEnv || fromEnv.includes('urban42')) return origin;
  }

  if (fromEnv) return fromEnv;
  if (origin) return origin;
  return 'https://app.milenkih-team.ru';
}

/**
 * @param {string} candidate
 * @param {string} fallback
 * @returns {string}
 */
function resolvePublicUrl(candidate, fallback) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  if (origin.includes('milenkih-team.ru')) {
    if (!candidate || candidate.includes('urban42')) return fallback;
  }
  return candidate || fallback;
}

const PB_URL = resolvePbUrl();

const MAX_AUTH_URL = resolvePublicUrl(
  import.meta.env.VITE_MAX_AUTH_URL || '',
  `${PB_URL}/api/max-auth`
);

const MEDIA_BASE_URL = `${PB_URL}/api/files`;

const MAX_APP_ID = import.meta.env.VITE_MAX_APP_ID || 'id420550689204_bot';

const MAX_SELLER_URL = import.meta.env.VITE_MAX_SELLER_URL || 'https://max.ru/u/f9LHodD0cOKlWp4-3nvjD4xLuY56sR9La9x_NG6-K05fCD4cEXtTPFHojmQ';

const IS_DEV = import.meta.env.DEV;

export { PB_URL, MAX_AUTH_URL, MEDIA_BASE_URL, MAX_APP_ID, MAX_SELLER_URL, IS_DEV };
