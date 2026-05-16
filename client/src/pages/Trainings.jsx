import React, { useState, useEffect, useRef } from 'react';
import pb, { isModerator } from '../services/pocketbase';
import CustomAlert from '../components/CustomAlert';
import './Trainings.css';

function Trainings({ user }) {
  const [trainings, setTrainings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [days, setDays] = useState([]);
  
  // Состояния модалок событий
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);

  // Форма добавления тренировки
  const [newTime, setNewTime] = useState('18:00');
  const [newDuration, setNewDuration] = useState(120);
  const [newType, setNewType] = useState('group');
  const [newMaxSlots, setNewMaxSlots] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ул. Тухачевского, 31б');
  const [customLocation, setCustomLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Логика кастомных уведомлений (Замена alert/confirm)
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: () => {} });

  const scrollContainerRef = useRef(null);
  const userIsModerator = isModerator();

  useEffect(() => {
    generateFourteenDays();
    loadTrainings();
  }, []);

  // Генерация 14 дней вперед, начиная с сегодняшнего дня
  const generateFourteenDays = () => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i);
      arr.push(nextDay);
    }
    setDays(arr);
    setSelectedDate(arr[0]);
  };

  const loadTrainings = async () => {
    try {
      const data = await pb.collection('trainings').getFullList({
        sort: 'date',
        expand: 'booked_users'
      });
      setTrainings(data);
      if (selectedTraining) {
        const updated = data.find(t => t.id === selectedTraining.id);
        if (updated) setSelectedTraining(updated);
      }
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    }
  };

  const triggerAlert = (title, message, onConfirm = () => {}) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type: 'alert',
      onConfirm: () => { setAlertState(prev => ({ ...prev, isOpen: false })); onConfirm(); }
    });
  };

  const triggerConfirm = (title, message, onConfirm) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm: () => { setAlertState(prev => ({ ...prev, isOpen: false })); onConfirm(); },
      onCancel: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Проверка типов тренировок на конкретную дату для расстановки цветных точек
  const getDayEventStatus = (date, currentTrainings) => {
    if (!currentTrainings || currentTrainings.length === 0) {
      return { hasGroup: false, hasTournament: false, isEmpty: true };
    }

    const dayTrainings = currentTrainings.filter(t => {
      const trainingDate = new Date(t.date);
      return trainingDate.getFullYear() === date.getFullYear() &&
            trainingDate.getMonth() === date.getMonth() &&
            trainingDate.getDate() === date.getDate();
    });

    return {
      hasGroup: dayTrainings.some(t => t.type === 'group'),
      hasTournament: dayTrainings.some(t => t.type === 'tournament'),
      isEmpty: dayTrainings.length === 0
    };
};

  const isSameDay = (d1, d2 ) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const formatCardDate = (dateString) => {
    const daysWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const d = new Date(dateString);
    return `${daysWeek[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const formatTimeRange = (dateString, durationMin) => {
    const start = new Date(dateString);
    const end = new Date(start.getTime() + durationMin * 60 * 1000);
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
  };

  // Добавление новой тренировки модератором
  const handleCreateTraining = async (e) => {
    e.preventDefault();
    try {
      const targetDate = new Date(selectedDate);
      const [hours, minutes] = newTime.split(':');
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const finalLocation = selectedLocation === 'другое' ? customLocation : selectedLocation;

      await pb.collection('trainings').create({
        date: targetDate.toISOString(),
        duration: parseInt(newDuration),
        type: newType,
        max_slots: newMaxSlots ? parseInt(newMaxSlots) : null,
        location: finalLocation,
        description: newDescription,
        booked_users: []
      });

      setShowAddModal(false);
      setNewMaxSlots('');
      setNewDescription('');
      setCustomLocation('');
      loadTrainings();
      triggerAlert('Успешно', 'Тренировка добавлена в календарь расписания.');
    } catch (error) {
      console.error(error);
      triggerAlert('Ошибка', 'Не удалось сохранить тренировку.');
    }
  };

  // Удаление всей тренировки модератором
  const handleDeleteTraining = (trainingId, e) => {
    e.stopPropagation();
    triggerConfirm('Удаление', 'Удалить эту тренировку из расписания навсегда?', async () => {
      try {
        await pb.collection('trainings').delete(trainingId);
        loadTrainings();
        triggerAlert('Удалено', 'Занятие полностью стерто из базы данных.');
      } catch (error) {
        triggerAlert('Ошибка', 'Не удалось удалить тренировку.');
      }
    });
  };

  // Запись пользователя на тренировку
  const handleBook = async (training, e) => {
    e.stopPropagation();
    const currentBooked = training.booked_users || [];
    
    if (training.max_slots && currentBooked.length >= training.max_slots) {
      triggerAlert('Мест нет', 'К сожалению, все доступные места на это время уже заняты.');
      return;
    }

    try {
      await pb.collection('trainings').update(training.id, {
        booked_users: [...currentBooked, user?.id]
      });
      loadTrainings();
      triggerAlert('Запись успешна', 'Вы успешно записались на теннисную тренировку!');
    } catch (error) {
      triggerAlert('Ошибка', 'Не удалось зафиксировать запись.');
    }
  };

  // Отмена записи пользователем
  const handleCancelBooking = async (training, e) => {
    e.stopPropagation();
    triggerConfirm('Отмена записи', 'Вы действительно хотите отменить свою запись на тренировку?', async () => {
      try {
        const currentBooked = training.booked_users || [];
        await pb.collection('trainings').update(training.id, {
          booked_users: currentBooked.filter(id => id !== user?.id)
        });
        loadTrainings();
        triggerAlert('Запись отменена', 'Вы успешно выписались из состава участников.');
      } catch (error) {
        triggerAlert('Ошибка', 'Не удалось отменить запись.');
      }
    });
  };

  // Модератор принудительно выписывает участника из карточки
  const handleKickUser = async (userId, e) => {
    e.stopPropagation();
    triggerConfirm('Исключение', 'Отменить запись этого игрока принудительно?', async () => {
      try {
        const currentBooked = selectedTraining.booked_users || [];
        await pb.collection('trainings').update(selectedTraining.id, {
          booked_users: currentBooked.filter(id => id !== userId)
        });
        await loadTrainings();
      } catch (error) {
        triggerAlert('Ошибка', 'Не удалось исключить участника.');
      }
    });
  };

  const filteredTrainings = trainings.filter(t => isSameDay(new Date(t.date), selectedDate));
  const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div className="trainings-container">
      {/* 14-дневный горизонтальный топ-бар */}
      <div className="calendar-strip" ref={scrollContainerRef}>
        {days.map((date, idx) => {
          const isSelected = isSameDay(date, selectedDate);
          const status = getDayEventStatus(date, trainings);
          return (
            <button 
              key={idx}
              className={`calendar-day-item ${isSelected ? 'active-day' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="day-name-label">{daysShort[date.getDay()]}</span>
              <span className="day-num-label">{date.getDate()}</span>
              {/* Синяя/красная/серая точка-маркер */}
              <div className="dots-indicator-container">
                {status.isEmpty && <div className="date-status-dot dot-gray" />}
                {status.hasGroup && <div className="date-status-dot dot-blue" />}
                {status.hasTournament && <div className="date-status-dot dot-red" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Шапка текущего дня с кнопкой "+" для модератора */}
      <div className="selected-day-header">
        <h3>{selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</h3>
        {userIsModerator && (
          <button className="add-training-context-btn" onClick={() => setShowAddModal(true)}>+</button>
        )}
      </div>

      {/* Список тренировок в столбик */}
      <div className="trainings-list-layout">
        {filteredTrainings.length === 0 ? (
          <div className="empty-trainings-msg">На этот день тренировок пока не запланировано.</div>
        ) : (
          filteredTrainings.map((t) => {
            const isUserBooked = t.booked_users?.includes(user?.id);
            const totalBooked = t.booked_users?.length || 0;
            const hasLimit = t.max_slots !== null && t.max_slots > 0;
            const isFull = hasLimit && totalBooked >= t.max_slots;

            return (
              <div 
                key={t.id} 
                className={`training-row-card neon-border-${t.type}`}
                onClick={() => { setSelectedTraining(t); setShowDetailModal(true); }}
              >
                <div className="card-main-info-col">
                  <span className="card-row-date">{formatCardDate(t.date)}</span>
                  <span className="card-row-time">{formatTimeRange(t.date, t.duration)}</span>
                  <span className="card-row-type-label">{t.type === 'group' ? 'Групповая тренировка' : 'Турнир секции'}</span>
                </div>

                <div className="card-actions-info-col">
                  {/* Счетчик мест по ТЗ */}
                  {hasLimit ? (
                    <span className="card-slots-counter">{totalBooked} / {t.max_slots} мест</span>
                  ) : (
                    <span className="card-slots-counter no-limit-label">Запись открыта</span>
                  )}

                  <div className="card-buttons-wrapper">
                    {isUserBooked ? (
                      <button className="action-circle-btn btn-cancel-cross" onClick={(e) => handleCancelBooking(t, e)}>✕</button>
                    ) : isFull ? (
                      <button className="text-status-full-label" disabled>Мест нет</button>
                    ) : (
                      <button className="action-circle-btn btn-add-plus" onClick={(e) => handleBook(t, e)}>+</button>
                    )}
                    
                    {userIsModerator && (
                      <button className="action-circle-btn btn-delete-trash" onClick={(e) => handleDeleteTraining(t.id, e)}>🗑️</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ТРЕНИРОВКИ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content trainings-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-x" onClick={() => setShowAddModal(false)}>✕</button>
            <h3>Новое мероприятие</h3>
            <form onSubmit={handleCreateTraining}>
              <div className="form-group-row">
                <label>Время начала:</label>
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} required />
              </div>
              <div className="form-group-row">
                <label>Длительность (мин):</label>
                <input type="number" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} required />
              </div>
              <div className="form-group-row">
                <label>Тип события:</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option value="group">Групповая тренировка</option>
                  <option value="tournament">Турнир</option>
                </select>
              </div>
              <div className="form-group-row">
                <label>Ограничение мест (пусто — нет):</label>
                <input type="number" placeholder="Например: 6" value={newMaxSlots} onChange={(e) => setNewMaxSlots(e.target.value)} />
              </div>
              <div className="form-group-row">
                <label>Место проведения:</label>
                <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                  <option value="ул. Тухачевского, 31б">ул. Тухачевского, 31б</option>
                  <option value="другое">Другое место...</option>
                </select>
              </div>
              {selectedLocation === 'другое' && (
                <div className="form-group-row fade-in-input">
                  <input type="text" placeholder="Введите адрес..." value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} required />
                </div>
              )}
              <div className="form-group-row">
                <textarea placeholder="Описание тренировки (необязательно)..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </div>
              <button type="submit" className="submit-btn-full">Создать расписание</button>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ДЕТАЛЬНОЙ ИНФОРМАЦИИ И УЧАСТНИКОВ */}
      {showDetailModal && selectedTraining && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content trainings-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-x" onClick={() => setShowDetailModal(false)}>✕</button>
            
            <div className="detail-scroll-area">
              <span className="detail-badge-type">{selectedTraining.type === 'group' ? 'Групповой сбор' : 'Турнирная сетка'}</span>
              <h3 className="detail-title-date">{formatCardDate(selectedTraining.date)}</h3>
              <p className="detail-time-range">⏱️ {formatTimeRange(selectedTraining.date, selectedTraining.duration)}</p>
              <p className="detail-location-text">📍 {selectedTraining.location}</p>
              
              {selectedTraining.description && (
                <div className="detail-desc-box">
                  <h4>Описание от организатора:</h4>
                  <p>{selectedTraining.description}</p>
                </div>
              )}

              {/* Список записавшихся для модератора по ТЗ */}
              <div className="detail-participants-section">
                <h4>Записанные игроки ({selectedTraining.booked_users?.length || 0})</h4>
                <div className="participants-list-wrapper">
                  {(!selectedTraining.expand?.booked_users || selectedTraining.expand.booked_users.length === 0) ? (
                    <p className="no-players-text">На эту тренировку пока никто не записался.</p>
                  ) : (
                    selectedTraining.expand.booked_users.map((player) => (
                      <div key={player.id} className="player-list-row">
                        <div className="player-meta-left">
                          <div className="player-avatar-mini">👤</div>
                          <span className="player-name-label">{player.full_name || 'Теннисист'}</span>
                        </div>
                        {userIsModerator && (
                          <button className="kick-player-btn" onClick={(e) => handleKickUser(player.id, e)}>Отменить запись</button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Переиспользуемый кастомный алерт верхнего уровня */}
      <CustomAlert 
        isOpen={alertState.isOpen} 
        title={alertState.title} 
        message={alertState.message} 
        type={alertState.type} 
        onConfirm={alertState.onConfirm} 
        onCancel={alertState.onCancel} 
      />
    </div>
  );
}

export default Trainings;
