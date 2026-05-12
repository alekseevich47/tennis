import React, { useState, useEffect } from 'react';
import { getChampionships, createChampionship, getMatches, createMatch, updateMatchResult, getPlayers, isModerator } from '../services/pocketbase';
import './Competitions.css';

/**
 * Компонент соревнований
 * Отображает чемпионаты и матчи с результатами
 */
function Competitions() {
  const [championships, setChampionships] = useState([]);
  const [selectedChampionship, setSelectedChampionship] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddChampionship, setShowAddChampionship] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const moderator = isModerator();

  useEffect(() => {
    loadChampionships();
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedChampionship) {
      loadMatches();
    }
  }, [selectedChampionship]);

  const loadChampionships = async () => {
    try {
      const data = await getChampionships();
      setChampionships(data);
      if (data.length > 0 && !selectedChampionship) {
        setSelectedChampionship(data[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки чемпионатов:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
    }
  };

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await getMatches(selectedChampionship);
      setMatches(data);
    } catch (error) {
      console.error('Ошибка загрузки матчей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChampionship = async (name) => {
    try {
      await createChampionship({ name, is_active: true });
      setShowAddChampionship(false);
      loadChampionships();
    } catch (error) {
      alert('Не удалось создать чемпионат');
    }
  };

  return (
    <div className="competitions">
      <header className="competitions-header">
        <h1>Соревнования</h1>
        {moderator && (
          <button className="add-btn" onClick={() => setShowAddChampionship(true)}>+</button>
        )}
      </header>

      {/* Выбор чемпионата */}
      <div className="championship-select">
        <select value={selectedChampionship} onChange={e => setSelectedChampionship(e.target.value)}>
          {championships.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {moderator && selectedChampionship && (
          <button className="create-match-btn" onClick={() => setShowAddMatch(true)}>+ Создать игру</button>
        )}
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : matches.length === 0 ? (
        <div className="empty">Нет матчей</div>
      ) : (
        <div className="matches-list">
          {matches.map(match => (
            <MatchCard 
              key={match.id} 
              match={match} 
              moderator={moderator}
              onEdit={() => setEditingMatch(match)}
            />
          ))}
        </div>
      )}

      {showAddChampionship && (
        <div className="modal-overlay" onClick={() => setShowAddChampionship(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новый чемпионат</h2>
              <button className="close-btn" onClick={() => setShowAddChampionship(false)}>✕</button>
            </div>
            <input type="text" placeholder="Название чемпионата" id="champ-name" />
            <button className="submit-btn" onClick={() => handleCreateChampionship(document.getElementById('champ-name').value)}>Создать</button>
          </div>
        </div>
      )}

      {showAddMatch && (
        <CreateMatchForm 
          championshipId={selectedChampionship}
          players={players}
          onClose={() => setShowAddMatch(false)}
          onSubmit={async (data) => {
            await createMatch(data);
            setShowAddMatch(false);
            loadMatches();
          }}
        />
      )}

      {editingMatch && (
        <EditMatchForm 
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSubmit={async (data) => {
            await updateMatchResult(editingMatch.id, data);
            setEditingMatch(null);
            loadMatches();
          }}
        />
      )}
    </div>
  );
}

/**
 * Карточка матча
 */
function MatchCard({ match, moderator, onEdit }) {
  const p1 = match.expand?.player1;
  const p2 = match.expand?.player2;
  const isFinished = match.status === 'finished';
  const isCancelled = match.status === 'cancelled';

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' + 
           date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`match-card ${isFinished ? 'finished' : ''} ${isCancelled ? 'cancelled' : ''}`}>
      <div className="match-players">
        <div className={`player ${isFinished && match.score_p1 > match.score_p2 ? 'winner' : ''}`}>
          {p1?.name || 'Игрок 1'}
        </div>
        <div className="match-info">
          <div className="match-date">{formatDate(match.date_time)}</div>
          {isFinished && (
            <div className="match-score">
              <span className={match.score_p1 > match.score_p2 ? 'winner-score' : ''}>{match.score_p1}</span>
              :
              <span className={match.score_p2 > match.score_p1 ? 'winner-score' : ''}>{match.score_p2}</span>
              {match.sets && <div className="sets">({match.sets})</div>}
            </div>
          )}
          {isCancelled && <div className="cancelled-text">Игра не состоялась</div>}
        </div>
        <div className={`player ${isFinished && match.score_p2 > match.score_p1 ? 'winner' : ''}`}>
          {p2?.name || 'Игрок 2'}
        </div>
      </div>
      {moderator && !isFinished && !isCancelled && (
        <button className="edit-match-btn" onClick={onEdit}>✏️</button>
      )}
    </div>
  );
}

/**
 * Форма создания матча
 */
function CreateMatchForm({ championshipId, players, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    championship: championshipId,
    player1: '',
    player2: '',
    date_time: ''
  });

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      status: 'scheduled',
      score_p1: 0,
      score_p2: 0
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать игру</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <select value={formData.player1} onChange={e => setFormData({...formData, player1: e.target.value})}>
          <option value="">Игрок 1</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={formData.player2} onChange={e => setFormData({...formData, player2: e.target.value})}>
          <option value="">Игрок 2</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="datetime-local" value={formData.date_time} onChange={e => setFormData({...formData, date_time: e.target.value})} />
        <button className="submit-btn green" onClick={handleSubmit}>Создать</button>
      </div>
    </div>
  );
}

/**
 * Форма редактирования результата матча
 */
function EditMatchForm({ match, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    score_p1: match.score_p1 || 0,
    score_p2: match.score_p2 || 0,
    sets: match.sets || '',
    status: match.status || 'scheduled'
  });

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      status: formData.status === 'cancelled' ? 'cancelled' : 'finished'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Результат игры</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
          <option value="scheduled">Запланирована</option>
          <option value="finished">Завершена</option>
          <option value="cancelled">Не состоялась</option>
        </select>
        <input type="number" placeholder="Счет игрока 1" value={formData.score_p1} onChange={e => setFormData({...formData, score_p1: parseInt(e.target.value)})} />
        <input type="number" placeholder="Счет игрока 2" value={formData.score_p2} onChange={e => setFormData({...formData, score_p2: parseInt(e.target.value)})} />
        <input type="text" placeholder="Сеты (например: 11:5, 5:11, 11:2)" value={formData.sets} onChange={e => setFormData({...formData, sets: e.target.value})} />
        <button className="submit-btn" onClick={handleSubmit}>Сохранить</button>
      </div>
    </div>
  );
}

export default Competitions;
