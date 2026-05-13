import React, { useState, useEffect } from 'react';
import { getPlayers, createPlayer, updatePlayer, getCurrentUser, isModerator } from '../services/pocketbase';
import './Rating.css';

/**
 * Компонент рейтинга игроков
 * Отображает таблицу с игроками и их статистикой
 */
function Rating() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const moderator = isModerator();

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rating">
      <header className="rating-header">
        <h1>Рейтинг игроков</h1>
        {moderator && (
          <button className="add-btn" onClick={() => setShowAddModal(true)}>+</button>
        )}
      </header>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : players.length === 0 ? (
        <div className="empty">Нет игроков</div>
      ) : (
        <div className="players-table">
          <div className="table-header">
            <span>#</span>
            <span>Игрок</span>
            <span>Очки</span>
            <span>И/П/П</span>
          </div>
          {players.map((player, index) => (
            <div key={player.id} className="player-row">
              <span className="rank">{index + 1}</span>
              <div className="player-info">
                {player.avatar ? (
                  <img 
                    src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${player.collectionId}/${player.id}/${player.avatar}`} 
                    alt="Avatar" 
                    className="avatar"
                  />
                ) : (
                  <div className="avatar-placeholder">{player.name?.[0] || '?'}</div>
                )}
                <div>
                  <div className="player-name">{player.name || 'Без имени'}</div>
                  <div className="player-details">
                    {player.birth_year && <span>{player.birth_year} г.р.</span>}
                    {player.hand && <span>• {player.hand}</span>}
                  </div>
                </div>
              </div>
              <span className="rating-points">{player.rating_points || 0}</span>
              <span className="stats">
                {player.games_count || 0}/{player.wins || 0}/{player.losses || 0}
              </span>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <PlayerForm 
          onClose={() => setShowAddModal(false)} 
          onSubmit={async (data) => {
            await createPlayer(data);
            setShowAddModal(false);
            loadPlayers();
          }} 
        />
      )}
    </div>
  );
}

/**
 * Форма добавления игрока
 */
function PlayerForm({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    birth_year: '',
    hand: 'Правая',
    rating_points: 0,
    games_count: 0,
    wins: 0,
    losses: 0,
    avatar: null
  });

  const handleSubmit = () => {
    const data = new FormData();
    data.append('name', formData.name);
    data.append('birth_year', parseInt(formData.birth_year) || 0);
    data.append('hand', formData.hand);
    data.append('rating_points', parseInt(formData.rating_points) || 0);
    data.append('games_count', parseInt(formData.games_count) || 0);
    data.append('wins', parseInt(formData.wins) || 0);
    data.append('losses', parseInt(formData.losses) || 0);
    if (formData.avatar) {
      data.append('avatar', formData.avatar);
    }
    onSubmit(data);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Добавить игрока</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <input type="text" placeholder="Фамилия Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <input type="number" placeholder="Год рождения" value={formData.birth_year} onChange={e => setFormData({...formData, birth_year: e.target.value})} />
        <select value={formData.hand} onChange={e => setFormData({...formData, hand: e.target.value})}>
          <option value="Правая">Правая</option>
          <option value="Левая">Левая</option>
        </select>
        <input type="number" placeholder="Рейтинговые очки" value={formData.rating_points} onChange={e => setFormData({...formData, rating_points: e.target.value})} />
        <input type="number" placeholder="Игр сыграно" value={formData.games_count} onChange={e => setFormData({...formData, games_count: e.target.value})} />
        <input type="number" placeholder="Побед" value={formData.wins} onChange={e => setFormData({...formData, wins: e.target.value})} />
        <input type="number" placeholder="Поражений" value={formData.losses} onChange={e => setFormData({...formData, losses: e.target.value})} />
        <input type="file" accept="image/*" onChange={e => setFormData({...formData, avatar: e.target.files[0]})} />
        <button className="submit-btn" onClick={handleSubmit}>Создать</button>
      </div>
    </div>
  );
}

export default Rating;
