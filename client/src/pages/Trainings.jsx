import React, { useState, useEffect } from 'react';
import { getTrainings, createTraining, bookTraining, cancelTrainingBooking, getCurrentUser, isModerator } from '../services/pocketbase';
import './Trainings.css';

/**
 * Компонент записи на тренировки
 * Отображает календарь с доступными датами и временем
 */
function Trainings() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTraining, setNewTraining] = useState({
    date: '',
    start_time: '',
    end_time: '',
    max_players: 10
  });
  const moderator = isModerator();
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      setLoading(true);
      const data = await getTrainings();
      setTrainings(data);
    } catch (error) {
      console.error('Ошибка загрузки тренировок:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async () => {
    try {
      await createTraining(newTraining);
      setNewTraining({ date: '', start_time: '', end_time: '', max_players: 10 });
      setShowAddModal(false);
      loadTrainings();
    } catch (error) {
      alert('Не удалось создать тренировку');
    }
  };

  const handleBook = async (trainingId) => {
    if (!currentUser) {
      alert('Необходимо войти в систему');
      return;
    }
    try {
      await bookTraining(trainingId, currentUser.id);
      loadTrainings();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCancel = async (trainingId) => {
    try {
      await cancelTrainingBooking(trainingId, currentUser.id);
      loadTrainings();
    } catch (error) {
      alert('Не удалось отменить запись');
    }
  };

  // Группировка тренировок по датам
  const groupedTrainings = trainings.reduce((acc, training) => {
    const date = training.date.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(training);
    return acc;
  }, {});

  return (
    <div className="trainings">
      <header className="trainings-header">
        <h1>Запись на тренировку</h1>
        {moderator && (
          <button className="add-btn" onClick={() => setShowAddModal(true)}>+</button>
        )}
      </header>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : Object.keys(groupedTrainings).length === 0 ? (
        <div className="empty">Нет запланированных тренировок</div>
      ) : (
        <div className="trainings-list">
          {Object.entries(groupedTrainings).map(([date, dayTrainings]) => (
            <div key={date} className="training-day">
              <h3>{new Date(date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              {dayTrainings.map(training => {
                const isBooked = currentUser && training.expand?.booked_users?.some(u => u.id === currentUser.id);
                const availableSpots = training.max_players - (training.expand?.booked_users?.length || 0);
                
                return (
                  <div key={training.id} className="training-slot" onClick={() => setSelectedDate(training)}>
                    <div className="time">
                      {training.start_time} - {training.end_time}
                    </div>
                    <div className="spots">
                      Мест: {availableSpots}/{training.max_players}
                    </div>
                    {!isBooked && availableSpots > 0 && moderator !== true && (
                      <button className="book-btn" onClick={(e) => { e.stopPropagation(); handleBook(training.id); }}>+</button>
                    )}
                    {isBooked && (
                      <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); handleCancel(training.id); }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить тренировку</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <input type="date" value={newTraining.date} onChange={e => setNewTraining({...newTraining, date: e.target.value})} />
            <input type="time" value={newTraining.start_time} onChange={e => setNewTraining({...newTraining, start_time: e.target.value})} placeholder="Начало" />
            <input type="time" value={newTraining.end_time} onChange={e => setNewTraining({...newTraining, end_time: e.target.value})} placeholder="Конец" />
            <input type="number" value={newTraining.max_players} onChange={e => setNewTraining({...newTraining, max_players: parseInt(e.target.value)})} placeholder="Макс. игроков" />
            <button className="submit-btn" onClick={handleCreateTraining}>Создать</button>
          </div>
        </div>
      )}

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Детали тренировки</h2>
              <button className="close-btn" onClick={() => setSelectedDate(null)}>✕</button>
            </div>
            <p><strong>Дата:</strong> {new Date(selectedDate.date).toLocaleDateString('ru-RU')}</p>
            <p><strong>Время:</strong> {selectedDate.start_time} - {selectedDate.end_time}</p>
            <p><strong>Записано:</strong> {selectedDate.expand?.booked_users?.length || 0}/{selectedDate.max_players}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trainings;
