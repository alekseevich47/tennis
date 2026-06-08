import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useAlertDialog } from '../../../components/ui/AlertDialog';
import { error } from '../../../lib/log';
import { updateTraining } from '../../../services/trainings';

const INITIAL_FORM = {
  date: '',
  duration: 120,
  type: 'group',
  maxSlots: '',
  location: '',
  description: ''
};

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function getFormFromTraining(training) {
  if (!training) return INITIAL_FORM;
  return {
    date: toDateTimeLocalValue(training.date),
    duration: training.duration || 0,
    type: training.type || 'group',
    maxSlots:
      training.max_slots === null || training.max_slots === undefined
        ? ''
        : String(training.max_slots),
    location: training.location || '',
    description: training.description || ''
  };
}

function getPatchFromForm(form) {
  return {
    date: new Date(form.date).toISOString(),
    duration: parseInt(String(form.duration), 10) || 0,
    type: form.type,
    max_slots: form.maxSlots ? parseInt(String(form.maxSlots), 10) : null,
    location: form.location,
    description: form.description
  };
}

function getPatchFromTraining(training) {
  return {
    date: training?.date ? new Date(training.date).toISOString() : '',
    duration: parseInt(String(training?.duration), 10) || 0,
    type: training?.type || 'group',
    max_slots:
      training?.max_slots === null || training?.max_slots === undefined
        ? null
        : parseInt(String(training.max_slots), 10),
    location: training?.location || '',
    description: training?.description || ''
  };
}

function buildTrainingPatch(training, form) {
  const nextValues = getPatchFromForm(form);
  const currentValues = getPatchFromTraining(training);

  return Object.fromEntries(
    Object.entries(nextValues).filter(([key, value]) => value !== currentValues[key])
  );
}

/**
 * @param {{
 *   isOpen: boolean,
 *   training: import('../../../services/trainings').TrainingRecord | null,
 *   onClose: () => void,
 *   onSaved: (updatedTraining: import('../../../services/trainings').TrainingRecord) => void
 * }} props
 */
function EditTrainingModal({ isOpen, training, onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { alert } = useAlertDialog();

  useEffect(() => {
    if (isOpen) {
      setForm(getFormFromTraining(training));
    }
  }, [isOpen, training]);

  const updateField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = () => {
    setForm(getFormFromTraining(training));
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !training) return;

    setSubmitting(true);
    try {
      const patch = buildTrainingPatch(training, form);
      if (Object.keys(patch).length === 0) {
        await alert({ title: 'Без изменений', message: 'Поля тренировки не изменились.' });
        return;
      }

      const updatedTraining = await updateTraining(training.id, patch);
      onSaved(updatedTraining);
      await alert({ title: 'Готово', message: 'Тренировка обновлена.' });
    } catch (err) {
      error('update training:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось сохранить изменения.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Редактирование тренировки">
      <form onSubmit={handleSubmit}>
        <div className="form-group-row">
          <label htmlFor="edit-training-date">Дата и время</label>
          <input
            id="edit-training-date"
            type="datetime-local"
            value={form.date}
            onChange={updateField('date')}
            required
          />
        </div>

        <div className="form-group-row">
          <label htmlFor="edit-training-duration">Длительность (мин)</label>
          <input
            id="edit-training-duration"
            type="number"
            value={form.duration}
            onChange={updateField('duration')}
            required
          />
        </div>

        <div className="form-group-row">
          <label htmlFor="edit-training-type">Тип события</label>
          <select id="edit-training-type" value={form.type} onChange={updateField('type')}>
            <option value="group">Тренировка</option>
            <option value="tournament">Турнир</option>
          </select>
        </div>

        <div className="form-group-row">
          <label htmlFor="edit-training-slots">Ограничение мест (пусто - нет)</label>
          <input
            id="edit-training-slots"
            type="number"
            placeholder="Например: 6"
            value={form.maxSlots}
            onChange={updateField('maxSlots')}
          />
        </div>

        <div className="form-group-row">
          <label htmlFor="edit-training-location">Место проведения</label>
          <input
            id="edit-training-location"
            type="text"
            value={form.location}
            onChange={updateField('location')}
            required
          />
        </div>

        <div className="form-group-row">
          <label htmlFor="edit-training-description">Описание</label>
          <textarea
            id="edit-training-description"
            placeholder="Описание тренировки (необязательно)..."
            value={form.description}
            onChange={updateField('description')}
          />
        </div>

        <button type="submit" className="submit-btn-full" disabled={submitting || !training}>
          {submitting ? 'Сохраняем...' : 'Сохранить изменения'}
        </button>
      </form>
    </Modal>
  );
}

export default EditTrainingModal;
