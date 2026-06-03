// @ts-check
// Конфигурация подключения к PocketBase и MAX SDK.

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://urban42.online/tt';

// URL для Cloud Function авторизации MAX (фикс C1: настоящий template literal).
const MAX_AUTH_URL = import.meta.env.VITE_MAX_AUTH_URL || `${PB_URL}/api/max-auth`;

// Базовый адрес для всех файлов PocketBase: `${MEDIA_BASE_URL}/${collectionId}/${recordId}/${filename}`.
const MEDIA_BASE_URL = `${PB_URL}/api/files`;

// ID приложения MAX (выдаётся в кабинете разработчика MAX).
const MAX_APP_ID = import.meta.env.VITE_MAX_APP_ID || 'id420550689204_bot';

const MAX_SELLER_URL = import.meta.env.VITE_MAX_SELLER_URL || 'https://max.ru/u/f9LHodD0cOKkZw87t6_Jy_PkELAZf1_Ycj-oyk_dnoGOBlY27GSpxl1YrZU';

const IS_DEV = import.meta.env.DEV;

export { PB_URL, MAX_AUTH_URL, MEDIA_BASE_URL, MAX_APP_ID, MAX_SELLER_URL, IS_DEV };
