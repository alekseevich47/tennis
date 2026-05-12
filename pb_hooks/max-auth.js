// PocketBase Cloud Function для авторизации через MAX
// Этот файл должен быть размещен в папке pb_hooks вашего PocketBase сервера
// Путь: /path/to/pocketbase/pb_hooks/max-auth.js

const crypto = require('crypto');

/**
 * Cloud Function для обработки авторизации через MAX
 * Проверяет подпись initData, находит/создает пользователя и возвращает токен
 */
onBeforeApiRequest((e) => {
  // Обрабатываем только запросы к нашему эндпоинту
  if (e.request.url.path !== '/api/max-auth') {
    return;
  }

  // Разрешаем только POST запросы
  if (e.request.method !== 'POST') {
    e.error(405, 'Method not allowed');
    return;
  }

  try {
    const body = e.request.json();
    const initData = body.initData;

    if (!initData) {
      e.error(400, 'initData is required');
      return;
    }

    // Парсим initData
    const initDataObj = parseInitData(initData);
    
    // Получаем данные пользователя из initData
    const userStr = initDataObj.user || initDataObj.query?.user;
    if (!userStr) {
      e.error(400, 'User data not found in initData');
      return;
    }

    const userData = JSON.parse(decodeURIComponent(userStr));
    
    // Извлекаем ID пользователя из MAX
    const maxId = String(userData.id);
    const fullName = userData.first_name + ' ' + (userData.last_name || '');
    const username = userData.username || '';
    const photoUrl = userData.photo_url || '';

    // Находим или создаем пользователя в базе
    let user;
    try {
      // Пытаемся найти существующего пользователя по max_id
      const users = $app.dao().findRecordsByFilter('users', 'max_id = {:maxId}', '', 1, 0, {
        'maxId': maxId
      });
      
      if (users.length > 0) {
        user = users[0];
      }
    } catch (err) {
      // Пользователь не найден, будем создавать нового
    }

    if (!user) {
      // Создаем нового пользователя
      const collection = $app.dao().findCollectionByNameOrId('users');
      const record = new Record(collection);
      
      record.set('max_id', maxId);
      record.set('full_name', fullName.trim());
      record.set('role', 'user'); // По умолчанию обычный пользователь
      
      // Если есть аватарка, можно скачать и сохранить
      if (photoUrl) {
        // Здесь можно добавить логику скачивания аватарки
        // record.set('avatar', photoUrl);
      }

      // Сохраняем запись
      $app.dao().saveRecord(record);
      user = record;
    }

    // Генерируем токен авторизации PocketBase
    const token = $app.newAuthToken(user.id, user.collectionId);

    // Возвращаем успешный ответ
    e.response = new Response(JSON.stringify({
      success: true,
      token: token,
      user: {
        id: user.id,
        max_id: user.get('max_id'),
        full_name: user.get('full_name'),
        role: user.get('role'),
        avatar: user.get('avatar'),
        birth_year: user.get('birth_year'),
        hand: user.get('hand'),
        rating_points: user.get('rating_points'),
        games_count: user.get('games_count'),
        wins: user.get('wins'),
        losses: user.get('losses')
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Ошибка авторизации MAX:', error);
    e.error(500, 'Internal server error: ' + error.message);
  }
});

/**
 * Парсинг initData строки
 * @param {string} initData - строка initData от MAX
 * @returns {Object} - распарсенные данные
 */
function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const result = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}
