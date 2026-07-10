import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';

const INITIAL = {
  name: '',
  birth_date: '',
  dominant_hand: 'Правая',
  rating_points: '0',
  avatar: /** @type {File | null} */ (null)
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSubmit: (data: FormData) => Promise<void> | void
 * }} props
 */
function PlayerForm({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('full_name', form.name);
      data.append('birth_date', form.birth_date);
      data.append('dominant_hand', form.dominant_hand);
      data.append('rating_points', String(parseInt(form.rating_points, 10) || 0));
      if (form.avatar) data.append('avatar', form.avatar);
      await onSubmit(data);
      setForm(INITIAL);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить игрока">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="player-name">Фамилия Имя</label>
          <input
            id="player-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField('name')(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="player-birth-date">Дата рождения</label>
          <input
            id="player-birth-date"
            type="date"
            value={form.birth_date}
            onChange={(e) => updateField('birth_date')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="player-hand">Ведущая рука</label>
          <select
            id="player-hand"
            value={form.dominant_hand}
            onChange={(e) => updateField('dominant_hand')(e.target.value)}
          >
            <option value="Правая">Правая</option>
            <option value="Левая">Левая</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="player-rating">Рейтинговые очки</label>
          <input
            id="player-rating"
            type="number"
            value={form.rating_points}
            onChange={(e) => updateField('rating_points')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="player-avatar">Аватар</label>
          <input
            id="player-avatar"
            type="file"
            accept="image/*"
            onChange={(e) => updateField('avatar')(e.target.files?.[0] ?? null)}
          />
        </div>

        <button type="submit" className="submit-btn-full" disabled={submitting}>
          {submitting ? 'Сохраняем...' : 'Создать'}
        </button>
      </form>
    </Modal>
  );
}

export default PlayerForm;
