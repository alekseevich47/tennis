import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { createTraining } from '../../services/trainings';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { error } from '../../lib/log';

const DEFAULT_LOCATION = 'ул. Тухачевского, 31/3';

const INITIAL_FORM = {
  time: '18:00',
  duration: 90,
  type: 'group',
  maxSlots: '',
  selectedLocation: DEFAULT_LOCATION,
  customLocation: '',
  description: ''
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   selectedDate: Date,
 *   onCreated: () => void
 * }} props
 */
function CreateTrainingModal({ isOpen, onClose, selectedDate, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { alert } = useAlertDialog();

  const updateField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const target = new Date(selectedDate);
      const [hours, minutes] = form.time.split(':');
      target.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0, 0, 0);

      const finalLocation =
        form.selectedLocation === 'другое' ? form.customLocation : form.selectedLocation;

      await createTraining({
        date: target.toISOString(),
        duration: parseInt(String(form.duration), 10) || 0,
        type: form.type,
        max_slots: form.maxSlots ? parseInt(String(form.maxSlots), 10) : null,
        location: finalLocation,
        description: form.description,
        booked_users: []
      });

      setForm(INITIAL_FORM);
      onCreated();
      await alert({ title: 'Готово', message: 'Тренировка добавлена в расписание.' });
    } catch (err) {
      error('create training:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось сохранить тренировку.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Новое мероприятие">
      <form onSubmit={handleSubmit}>
        <div className="form-group-row">
          <label htmlFor="training-time">Время начала</label>
          <input
            id="training-time"
            type="time"
            value={form.time}
            onChange={updateField('time')}
            required
          />
        </div>

        <div className="form-group-row">
          <label htmlFor="training-duration">Длительность (мин)</label>
          <input
            id="training-duration"
            type="number"
            value={form.duration}
            onChange={updateField('duration')}
            required
          />
        </div>

        <div className="form-group-row">
          <label htmlFor="training-type">Тип события</label>
          <select id="training-type" value={form.type} onChange={updateField('type')}>
            <option value="group">Тренировка</option>
            <option value="tournament">Турнир</option>
          </select>
        </div>

        <div className="form-group-row">
          <label htmlFor="training-slots">Ограничение мест (пусто — нет)</label>
          <input
            id="training-slots"
            type="number"
            placeholder="Например: 6"
            value={form.maxSlots}
            onChange={updateField('maxSlots')}
          />
        </div>

        <div className="form-group-row">
          <label htmlFor="training-location">Место проведения</label>
          <select
            id="training-location"
            value={form.selectedLocation}
            onChange={updateField('selectedLocation')}
          >
            <option value={DEFAULT_LOCATION}>{DEFAULT_LOCATION}</option>
            <option value="другое">Другое место...</option>
          </select>
        </div>

        {form.selectedLocation === 'другое' && (
          <div className="form-group-row fade-in-input">
            <label htmlFor="training-custom-location">Адрес</label>
            <input
              id="training-custom-location"
              type="text"
              placeholder="Введите адрес..."
              value={form.customLocation}
              onChange={updateField('customLocation')}
              required
            />
          </div>
        )}

        <div className="form-group-row">
          <label htmlFor="training-description">Описание</label>
          <textarea
            id="training-description"
            placeholder="Описание тренировки (необязательно)..."
            value={form.description}
            onChange={updateField('description')}
          />
        </div>

        <button type="submit" className="submit-btn-full" disabled={submitting}>
          {submitting ? 'Сохраняем...' : 'Создать расписание'}
        </button>
      </form>
    </Modal>
  );
}

export default CreateTrainingModal;
