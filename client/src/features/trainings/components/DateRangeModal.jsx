import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useAlertDialog } from '../../../components/ui/AlertDialog';
import '../Trainings.css';

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onConfirm: (range: { start: string, end: string }) => void,
 *   defaultRange?: { start: string, end: string } | null
 * }} props
 */
function DateRangeModal({ isOpen, onClose, onConfirm, defaultRange = null }) {
  const { alert } = useAlertDialog();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const defaults = defaultRange || getDefaultDateRange();
    setStart(defaults.start);
    setEnd(defaults.end);
  }, [isOpen, defaultRange]);

  const handleConfirm = async () => {
    if (!start || !end || start > end) {
      await alert({
        title: 'Ошибка',
        message: 'Дата начала не может быть позже даты окончания.'
      });
      return;
    }

    onConfirm({ start, end });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выбрать период" showCloseButton>
      <div className="date-range-modal-body">
        <label htmlFor="date-range-start">
          Начало отчётного периода
          <input
            id="date-range-start"
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label htmlFor="date-range-end">
          Конец отчётного периода
          <input
            id="date-range-end"
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <button type="button" className="date-range-confirm-btn" onClick={handleConfirm}>
          Подтвердить
        </button>
      </div>
    </Modal>
  );
}

export default DateRangeModal;
