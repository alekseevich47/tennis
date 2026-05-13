// Конфигурация подключения к PocketBase и MAX SDK
const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://urban42.online/tt';

// URL для Cloud Function авторизации MAX
const MAX_AUTH_URL = import.meta.env.VITE_MAX_AUTH_URL || `\${PB_URL}/api/max-auth`;

// ID приложения MAX (получается в кабинете разработчика MAX)
const MAX_APP_ID = import.meta.env.VITE_MAX_APP_ID || 'id420550689204_bot';

// ЕДИНСТВЕННЫЙ ЭКСПОРТ (теперь без ошибок)
export { PB_URL, MAX_AUTH_URL, MAX_APP_ID };
