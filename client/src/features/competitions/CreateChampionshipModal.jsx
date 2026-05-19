import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { createChampionship } from '../../services/catalog';
import { error } from '../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onCreated: () => void
 * }} props
 */
function CreateChampionshipModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { alert } = useAlertDialog();

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createChampionship({ name });
      setName('');
      onCreated();
    } catch (err) {
      error('create championship:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось создать чемпионат.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Новый чемпионат">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="champ-name">Название чемпионата</label>
          <input
            id="champ-name"
            type="text"
            placeholder="Например, Зимний кубок 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="submit-btn-full" disabled={submitting}>
          {submitting ? 'Создаём...' : 'Создать'}
        </button>
      </form>
    </Modal>
  );
}

export default CreateChampionshipModal;
