import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useAlertDialog } from '../../../components/ui/AlertDialog';
import { parseDateInputValue, toDateInputValue, toSelectedRange } from '../../../lib/datePickerUtils';
import DateRangePicker from './DateRangePicker';
import '../Trainings.css';

export function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

export function getArchiveDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

function formatRangeHint(selected) {
  if (!selected?.from) return 'Выберите дату или период';
  const fmt = (date) =>
    date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!selected.to) return fmt(selected.from);
  if (toDateInputValue(selected.from) === toDateInputValue(selected.to)) {
    return fmt(selected.from);
  }
  return `${fmt(selected.from)} — ${fmt(selected.to)}`;
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
  const [selected, setSelected] = useState(undefined);
  const [displayAnchor, setDisplayAnchor] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) return;
    const defaults = defaultRange || getDefaultDateRange();
    setSelected(toSelectedRange(defaults));
    setDisplayAnchor(new Date());
  }, [isOpen, defaultRange]);

  const handleConfirm = async () => {
    if (!selected?.from) {
      await alert({
        title: 'Ошибка',
        message: 'Выберите дату или период на календаре.'
      });
      return;
    }

    const start = toDateInputValue(selected.from);
    const end = toDateInputValue(selected.to || selected.from);

    if (start > end) {
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
        <DateRangePicker
          selectedRange={selected}
          onSelectRange={setSelected}
          initialDisplayMonth={displayAnchor}
        />
        <p className="date-range-hint" aria-live="polite">
          {formatRangeHint(selected)}
        </p>
        <button type="button" className="date-range-confirm-btn" onClick={handleConfirm}>
          Подтвердить
        </button>
      </div>
    </Modal>
  );
}

export default DateRangeModal;
