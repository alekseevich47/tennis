import React, { useState, useEffect } from 'react';
import pb, { getTrainings } from '../services/pocketbase';
import './Profile.css';

// Принимаем user из пропсов
function Profile({ user: initialUser, onUpdate }) {
  const [user, setUser] = useState(initialUser);
  const [myTrainings, setMyTrainings] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [dominantHand, setDominantHand] = useState('Правая');

  // Синхронизируем пропс со стейтом при изменении или загрузке
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setFullName(initialUser.full_name || '');
      setAge(initialUser.age || '');
      setDominantHand(initialUser.dominant_hand || 'Правая');
      loadUserTrainings(initialUser.id);
    }
  }, [initialUser]);

  const loadUserTrainings = async (userId) => {
    try {
      const allTrainings = await getTrainings();
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
      // 1. Обновляем запись в базе данных
      const updatedRecord = await pb.collection('users').update(user.id, {
        full_name: fullName,
        age: age ? parseInt(age) : null,
        dominant_hand: dominantHand
      });

      // 2. КРИТИЧЕСКИЙ ФИКС: Принудительно обновляем запись в локальном хранилище PocketBase
      // Это предотвратит автоматический сброс сессии в "Гость"
      pb.authStore.save(pb.authStore.token, updatedRecord);

      setUser(updatedRecord);
      setIsEditing(false);
      
      // 3. Передаем обновленного пользователя в App.jsx, чтобы обновить хедер без перезагрузки
      if (onUpdate) onUpdate(updatedRecord); 
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
      <button className="edit-profile-btn" onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? '✕' : '✏️'}
      </button>

      {isEditing ? (
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
        <div className="profile-view">
          <div className="avatar-large">{userInitial}</div>
          <h2 className="profile-user-name">{user.full_name}</h2>
          
          <div className="profile-meta-info">
            <p><strong>Возраст:</strong> {user.age ? `${user.age} лет` : 'Не указан'}</p>
            <p><strong>Рука:</strong> {user.dominant_hand || 'Не указана'}</p>
          </div>

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
