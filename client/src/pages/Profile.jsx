import React, { useState, useEffect } from 'react';
import pb, { getCurrentUser, getTrainings } from '../services/pocketbase';
import './Profile.css';

function Profile({ onUpdate }) {
  const [user, setUser] = useState(null);
  const [myTrainings, setMyTrainings] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Поля формы редактирования
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [dominantHand, setDominantHand] = useState('Правая');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setFullName(currentUser.full_name || '');
      setAge(currentUser.age || '');
      setDominantHand(currentUser.dominant_hand || 'Правая');
      loadUserTrainings(currentUser.id);
    }
  }, []);

  // Загрузка тренировок, на которые записан игрок
  const loadUserTrainings = async (userId) => {
    try {
      const allTrainings = await getTrainings();
      // Фильтруем тренировки, где booked_users содержит ID текущего пользователя
      const filtered = allTrainings.filter(t => t.booked_users && t.booked_users.includes(userId));
      setMyTrainings(filtered);
    } catch (error) {
      console.error('Ошибка загрузки тренировок профиля:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Обновляем запись пользователя в PocketBase
      const updatedRecord = await pb.collection('users').update(user.id, {
        full_name: fullName,
        age: age ? parseInt(age) : null,
        dominant_hand: dominantHand
      });

      setUser(updatedRecord);
      setIsEditing(false);
      if (onUpdate) onUpdate(); // Уведомляем App.jsx для обновления хедера
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
      alert('Не удалось сохранить изменения');
    }
  };

  if (!user) {
    return <div className="profile-container">Пользователь не авторизован</div>;
  }

  const userInitial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="profile-container">
      {/* Кнопка редактирования (Карандаш) */}
      <button className="edit-profile-btn" onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? '✕' : '✏️'}
      </button>

      {isEditing ? (
        /* Режим редактирования */
        <form onSubmit={handleSave} className="profile-edit-form">
          <div className="avatar-large">{userInitial}</div>
          
          <div className="form-group">
            <label>Имя фамилия:</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Возраст:</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} min="1" max="100" />
          </div>

          <div className="form-group">
            <label>Ведущая рука:</label>
            <select value={dominantHand} onChange={e => setDominantHand(e.target.value)}>
              <option value="Правая">Правая</option>
              <option value="Левая">Левая</option>
              <option value="Амбидекстр">Амбидекстр</option>
            </select>
          </div>

          <button type="submit" className="save-profile-btn">Сохранить</button>
        </form>
      ) : (
        /* Режим просмотра */
        <div className="profile-view">
          <div className="avatar-large">{userInitial}</div>
          <h2 className="profile-user-name">{user.full_name}</h2>
          
          <div className="profile-meta-info">
            <p><strong>Возраст:</strong> {user.age ? `${user.age} лет` : 'Не указан'}</p>
            <p><strong>Рука:</strong> {user.dominant_hand || 'Не указана'}</p>
          </div>

          {/* Блок статистики X/Y/Z */}
          <div className="profile-stats-block">
            <h3>Статистика игр</h3>
            <div className="stats-counter">
              {user.games_count || 0} / {user.wins || 0} / {user.losses || 0}
            </div>
            <div className="stats-labels">
              <span>Игры</span>
              <span>Победы</span>
              <span>Поражения</span>
            </div>
          </div>

          {/* Блок тренировок */}
          <div className="profile-trainings-block">
            <h3>Мои тренировки ({myTrainings.length})</h3>
            {myTrainings.length === 0 ? (
              <p className="no-data-text">Вы еще не записаны на тренировки</p>
            ) : (
              <div className="profile-trainings-list">
                {myTrainings.map(t => (
                  <div key={t.id} className="profile-training-card">
                    <span className="training-date">{new Date(t.date).toLocaleDateString()}</span>
                    <span className="training-title">{t.title || 'Общая тренировка'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
