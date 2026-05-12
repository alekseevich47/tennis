// Конфигурация подключения к PocketBase и MAX SDK
export const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';

// URL для Cloud Function авторизации MAX
export const MAX_AUTH_URL = import.meta.env.VITE_MAX_AUTH_URL || `${PB_URL}/api/max-auth`;

// ID приложения MAX (получается в кабинете разработчика MAX)
export const MAX_APP_ID = import.meta.env.VITE_MAX_APP_ID || '';

// Экспорт для использования в приложении
export { PB_URL, MAX_AUTH_URL, MAX_APP_ID };
