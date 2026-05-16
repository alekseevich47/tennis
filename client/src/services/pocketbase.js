import PocketBase from 'pocketbase';
import { PB_URL, MAX_AUTH_URL } from '../config';

// Единый инстанс для всего приложения, автоматически сохраняющий сессию в localStorage
const pb = new PocketBase(PB_URL);

/**
 * Инициализация авторизации через MAX
 */
export const initMaxAuth = async (initData) => {
  try {
    const response = await fetch(MAX_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    if (!response.ok) {
      throw new Error('Сервер авторизации MAX вернул ошибку');
    }

    const data = await response.json();
    
    if (data.token && data.user) {
      // Сохраняем токен и модель пользователя в глобальный authStore
      pb.authStore.save(data.token, data.user);
      console.log('Авторизация в PocketBase успешно зафиксирована для текущего сеанса.');
    }
    
    return data.user;
  } catch (error) {
    console.error('Ошибка initMaxAuth:', error);
    throw error;
  }
};

/**
 * Получение текущего авторизованного пользователя из локального хранилища
 */
export const getCurrentUser = () => {
  return pb.authStore.model;
};


/**
 * Проверка, является ли пользователь модератором
 * @returns {boolean}
 */
export const isModerator = () => {
  const user = getCurrentUser();
  return user && (user.role === 'moderator' || user.email === 'admin@example.com');
};

/**
 * Получение списка постов с комментариями
 * @returns {Promise<Array>}
 */
export const getPosts = async () => {
  try {
    // Вытягиваем посты, а также вложенные комментарии и профили их авторов
    return await pb.collection('posts').getFullList({
      sort: '-created',
      expand: 'comments_id.author,author' 
    });
  } catch (error) {
    console.error('Ошибка получения постов:', error);
    throw error;
  }
};

/**
 * Создание нового поста
 * @param {Object} postData 
 * @returns {Promise<Object>}
 */
export const createPost = async (postData) => {
  try {
    const record = await pb.collection('posts').create(postData);
    return record;
  } catch (error) {
    console.error('Ошибка создания поста:', error);
    throw error;
  }
};

/**
 * Добавление комментария к посту
 * @param {string} postId 
 * @param {string} text 
 * @returns {Promise<Object>}
 */
export const addComment = async (postId, text) => {
  try {
    const record = await pb.collection('comments').create({
      post: postId,
      author: getCurrentUser().id,
      text: text
    });
    return record;
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    throw error;
  }
};


/**
 * Создание тренировки
 * @param {Object} trainingData 
 * @returns {Promise<Object>}
 */
export const createTraining = async (trainingData) => {
  try {
    const record = await pb.collection('trainings').create(trainingData);
    return record;
  } catch (error) {
    console.error('Ошибка создания тренировки:', error);
    throw error;
  }
};

/**
 * Запись на тренировку
 * @param {string} trainingId 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export const bookTraining = async (trainingId, userId) => {
  try {
    const training = await pb.collection('trainings').getOne(trainingId);
    const bookedUsers = training.booked_users || [];
    
    if (bookedUsers.includes(userId)) {
      throw new Error('Вы уже записаны на эту тренировку');
    }
    
    if (bookedUsers.length >= training.max_players) {
      throw new Error('Нет свободных мест');
    }
    
    const record = await pb.collection('trainings').update(trainingId, {
      booked_users: [...bookedUsers, userId]
    });
    return record;
  } catch (error) {
    console.error('Ошибка записи на тренировку:', error);
    throw error;
  }
};

/**
 * Отмена записи на тренировку
 * @param {string} trainingId 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export const cancelTrainingBooking = async (trainingId, userId) => {
  try {
    const training = await pb.collection('trainings').getOne(trainingId);
    const bookedUsers = training.booked_users || [];
    
    const updatedUsers = bookedUsers.filter(id => id !== userId);
    
    const record = await pb.collection('trainings').update(trainingId, {
      booked_users: updatedUsers
    });
    return record;
  } catch (error) {
    console.error('Ошибка отмены записи:', error);
    throw error;
  }
};

/**
 * Получение товаров
 * @returns {Promise<Array>}
 */
export const getProducts = async () => {
  try {
    const records = await pb.collection('products').getFullList({
      sort: '-created'
    });
    return records;
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    throw error;
  }
};

/**
 * Создание товара
 * @param {Object} productData 
 * @returns {Promise<Object>}
 */
export const createProduct = async (productData) => {
  try {
    const record = await pb.collection('products').create(productData);
    return record;
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    throw error;
  }
};

/**
 * Обновление товара
 * @param {string} productId 
 * @param {Object} productData 
 * @returns {Promise<Object>}
 */
export const updateProduct = async (productId, productData) => {
  try {
    const record = await pb.collection('products').update(productId, productData);
    return record;
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    throw error;
  }
};

/**
 * Удаление товара
 * @param {string} productId 
 * @returns {Promise<void>}
 */
export const deleteProduct = async (productId) => {
  try {
    await pb.collection('products').delete(productId);
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    throw error;
  }
};

/**
 * Получение игроков
 * @returns {Promise<Array>}
 */
export const getPlayers = async () => {
  try {
    const records = await pb.collection('users').getFullList({
      sort: '-rating_points'
    });
    return records;
  } catch (error) {
    console.error('Ошибка получения игроков:', error);
    throw error;
  }
};

/**
 * Создание игрока
 * @param {Object} playerData 
 * @returns {Promise<Object>}
 */
export const createPlayer = async (playerData) => {
  try {
    const record = await pb.collection('users').create(playerData);
    return record;
  } catch (error) {
    console.error('Ошибка создания игрока:', error);
    throw error;
  }
};

/**
 * Обновление данных игрока
 * @param {string} playerId 
 * @param {Object} playerData 
 * @returns {Promise<Object>}
 */
export const updatePlayer = async (playerId, playerData) => {
  try {
    const record = await pb.collection('users').update(playerId, playerData);
    return record;
  } catch (error) {
    console.error('Ошибка обновления игрока:', error);
    throw error;
  }
};

/**
 * Получение чемпионатов
 * @returns {Promise<Array>}
 */
export const getChampionships = async () => {
  try {
    const records = await pb.collection('championships').getFullList({
      filter: 'is_active = true'
    });
    return records;
  } catch (error) {
    console.error('Ошибка получения чемпионатов:', error);
    throw error;
  }
};

/**
 * Создание чемпионата
 * @param {Object} championshipData 
 * @returns {Promise<Object>}
 */
export const createChampionship = async (championshipData) => {
  try {
    const record = await pb.collection('championships').create(championshipData);
    return record;
  } catch (error) {
    console.error('Ошибка создания чемпионата:', error);
    throw error;
  }
};

/**
 * Получение матчей
 * @param {string} championshipId 
 * @returns {Promise<Array>}
 */
export const getMatches = async (championshipId) => {
  try {
    const filter = championshipId ? `championship = "${championshipId}"` : '';
    const records = await pb.collection('matches').getFullList({
      filter: filter,
      sort: 'date_time',
      expand: 'player1,player2,championship'
    });
    return records;
  } catch (error) {
    console.error('Ошибка получения матчей:', error);
    throw error;
  }
};

/**
 * Создание матча
 * @param {Object} matchData 
 * @returns {Promise<Object>}
 */
export const createMatch = async (matchData) => {
  try {
    const record = await pb.collection('matches').create(matchData);
    return record;
  } catch (error) {
    console.error('Ошибка создания матча:', error);
    throw error;
  }
};

/**
 * Обновление результата матча
 * @param {string} matchId 
 * @param {Object} matchData 
 * @returns {Promise<Object>}
 */
export const updateMatchResult = async (matchId, matchData) => {
  try {
    const record = await pb.collection('matches').update(matchId, matchData);
    
    // Если матч завершен, обновляем статистику игроков
    if (matchData.status === 'finished' && matchData.score_p1 !== undefined && matchData.score_p2 !== undefined) {
      await updatePlayerStats(matchData.player1, matchData.player2, matchData.score_p1, matchData.score_p2);
    }
    
    return record;
  } catch (error) {
    console.error('Ошибка обновления результата матча:', error);
    throw error;
  }
};

/**
 * Обновление статистики игроков после матча
 * @param {string} player1Id 
 * @param {string} player2Id 
 * @param {number} score1 
 * @param {number} score2 
 */
const updatePlayerStats = async (player1Id, player2Id, score1, score2) => {
  try {
    const player1 = await pb.collection('users').getOne(player1Id);
    const player2 = await pb.collection('users').getOne(player2Id);
    
    // Обновляем количество игр
    const p1Games = (player1.games_count || 0) + 1;
    const p2Games = (player2.games_count || 0) + 1;
    
    // Определяем победителя
    let p1Wins = player1.wins || 0;
    let p1Losses = player1.losses || 0;
    let p2Wins = player2.wins || 0;
    let p2Losses = player2.losses || 0;
    let p1Rating = player1.rating_points || 0;
    let p2Rating = player2.rating_points || 0;
    
    if (score1 > score2) {
      p1Wins += 1;
      p2Losses += 1;
      p1Rating += 10;
      p2Rating -= 5;
    } else if (score2 > score1) {
      p2Wins += 1;
      p1Losses += 1;
      p2Rating += 10;
      p1Rating -= 5;
    }
    
    // Обновляем данные игроков
    await pb.collection('users').update(player1Id, {
      games_count: p1Games,
      wins: p1Wins,
      losses: p1Losses,
      rating_points: p1Rating
    });
    
    await pb.collection('users').update(player2Id, {
      games_count: p2Games,
      wins: p2Wins,
      losses: p2Losses,
      rating_points: p2Rating
    });
  } catch (error) {
    console.error('Ошибка обновления статистики:', error);
  }
};

/**
 * Получение данных для формирования аватарки пользователя MAX
 * @param {Object} userObj - Объект пользователя из базы данных
 * @returns {Object} { hasAvatar: boolean, src: string, initial: string }
 */
export const getUserAvatarData = (userObj) => {
  const initial = userObj?.full_name ? userObj.full_name.charAt(0).toUpperCase() : 'U';
  const src = userObj?.avatar_url || '';
  const hasAvatar = src.length > 0;
  
  return { hasAvatar, src, initial };
};

/**
 * Получение фотографий галереи
 * @returns {Promise<Array>}
 */
export const getGallery = async () => {
  try {
    const records = await pb.collection('gallery').getFullList({
      sort: '-created'
    });
    return records;
  } catch (error) {
    console.error('Ошибка получения галереи:', error);
    throw error;
  }
};

/**
 * Добавление фотографии в галерею
 * @param {File} imageFile 
 * @returns {Promise<Object>}
 */
export const addToGallery = async (imageFile) => {
  try {
    const record = await pb.collection('gallery').create({
      image: imageFile
    });
    return record;
  } catch (error) {
    console.error('Ошибка добавления в галерею:', error);
    throw error;
  }
};

/**
 * Удаление фотографии из галереи
 * @param {string} imageId 
 * @returns {Promise<void>}
 */
export const deleteFromGallery = async (imageId) => {
  try {
    await pb.collection('gallery').delete(imageId);
  } catch (error) {
    console.error('Ошибка удаления из галереи:', error);
    throw error;
  }
};

export default pb;

// Получение полного списка тренировок для календаря
export const getTrainings = async () => {
  try {
    return await pb.collection('trainings').getFullList({
      sort: 'date',
      expand: 'booked_users' // Подтягиваем данные записавшихся игроков
    });
  } catch (error) {
    console.error('Ошибка получения тренировок:', error);
    throw error;
  }
};