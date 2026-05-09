// Конфигурация подключения к PocketBase
export const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';

// Экспорт для использования в приложении
export { PB_URL };
