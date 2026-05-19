import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';

/**
 * @param {{
 *   isOpen: boolean,
 *   match: any | null,
 *   onClose: () => void,
 *   onSubmit: (data: any) => Promise<void> | void
 * }} props
 */
function EditMatchForm({ isOpen, match, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    score_p1: match?.score_p1 ?? 0,
    score_p2: match?.score_p2 ?? 0,
    sets: match?.sets || '',
    status: match?.status || 'scheduled'
  }));
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !match) return;
    setSubmitting(true);
    try {
      await onSubmit({
        score_p1: parseInt(String(form.score_p1), 10) || 0,
        score_p2: parseInt(String(form.score_p2), 10) || 0,
        sets: form.sets,
        status: form.status === 'cancelled' ? 'cancelled' : 'finished',
        player1: match.player1,
        player2: match.player2
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!match) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Результат игры">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="match-status">Статус</label>
          <select
            id="match-status"
            value={form.status}
            onChange={(e) => updateField('status')(e.target.value)}
          >
            <option value="scheduled">Запланирована</option>
            <option value="finished">Завершена</option>
            <option value="cancelled">Не состоялась</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="match-score-p1">Счёт игрока 1</label>
          <input
            id="match-score-p1"
            type="number"
            value={form.score_p1}
            onChange={(e) => updateField('score_p1')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="match-score-p2">Счёт игрока 2</label>
          <input
            id="match-score-p2"
            type="number"
            value={form.score_p2}
            onChange={(e) => updateField('score_p2')(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="match-sets">Сеты</label>
          <input
            id="match-sets"
            type="text"
            placeholder="Например: 11:5, 5:11, 11:2"
            value={form.sets}
            onChange={(e) => updateField('sets')(e.target.value)}
          />
        </div>

        <button type="submit" className="submit-btn-full" disabled={submitting}>
          {submitting ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </form>
    </Modal>
  );
}

export default EditMatchForm;
