import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';

const INITIAL = {
  name: '',
  birth_year: '',
  hand: 'Правая',
  rating_points: '0',
  games_count: '0',
  wins: '0',
  losses: '0',
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
      data.append('birth_year', String(parseInt(form.birth_year, 10) || 0));
      data.append('hand', form.hand);
      data.append('rating_points', String(parseInt(form.rating_points, 10) || 0));
      data.append('games_count', String(parseInt(form.games_count, 10) || 0));
      data.append('wins', String(parseInt(form.wins, 10) || 0));
      data.append('losses', String(parseInt(form.losses, 10) || 0));
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
          <label htmlFor="player-birth-year">Год рождения</label>
          <input
            id="player-birth-year"
            type="number"
            value={form.birth_year}
            onChange={(e) => updateField('birth_year')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="player-hand">Ведущая рука</label>
          <select
            id="player-hand"
            value={form.hand}
            onChange={(e) => updateField('hand')(e.target.value)}
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
          <label htmlFor="player-games">Игр сыграно</label>
          <input
            id="player-games"
            type="number"
            value={form.games_count}
            onChange={(e) => updateField('games_count')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="player-wins">Побед</label>
          <input
            id="player-wins"
            type="number"
            value={form.wins}
            onChange={(e) => updateField('wins')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="player-losses">Поражений</label>
          <input
            id="player-losses"
            type="number"
            value={form.losses}
            onChange={(e) => updateField('losses')(e.target.value)}
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
