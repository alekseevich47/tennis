import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';

/**
 * @param {{
 *   isOpen: boolean,
 *   championshipId: string,
 *   players: any[],
 *   onClose: () => void,
 *   onSubmit: (data: any) => Promise<void> | void
 * }} props
 */
function CreateMatchForm({ isOpen, championshipId, players, onClose, onSubmit }) {
  const [form, setForm] = useState({
    player1: '',
    player2: '',
    date_time: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    setForm({ player1: '', player2: '', date_time: '' });
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        championship: championshipId,
        player1: form.player1,
        player2: form.player2,
        date_time: form.date_time,
        status: 'scheduled',
        score_p1: 0,
        score_p2: 0
      });
      setForm({ player1: '', player2: '', date_time: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Создать игру">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="match-player1">Игрок 1</label>
          <select
            id="match-player1"
            value={form.player1}
            onChange={(e) => updateField('player1')(e.target.value)}
            required
          >
            <option value="">Выберите игрока</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="match-player2">Игрок 2</label>
          <select
            id="match-player2"
            value={form.player2}
            onChange={(e) => updateField('player2')(e.target.value)}
            required
          >
            <option value="">Выберите игрока</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="match-date-time">Дата и время</label>
          <input
            id="match-date-time"
            type="datetime-local"
            value={form.date_time}
            onChange={(e) => updateField('date_time')(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="submit-btn-full submit-btn-green" disabled={submitting}>
          {submitting ? 'Создаём...' : 'Создать'}
        </button>
      </form>
    </Modal>
  );
}

export default CreateMatchForm;
