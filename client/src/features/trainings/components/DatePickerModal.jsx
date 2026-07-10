import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useAlertDialog } from '../../../components/ui/AlertDialog';
import { parseDateInputValue } from '../../../lib/datePickerUtils';
import DateRangePicker from './DateRangePicker';
import '../Trainings.css';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onConfirm: (date: Date) => void,
 *   defaultDate?: string | null
 * }} props
 */
function DatePickerModal({ isOpen, onClose, onConfirm, defaultDate = null }) {
  const { alert } = useAlertDialog();
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [displayAnchor, setDisplayAnchor] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) return;
    setSelectedDate(defaultDate ? parseDateInputValue(defaultDate) : undefined);
    setDisplayAnchor(new Date());
  }, [isOpen, defaultDate]);

  const handleConfirm = async () => {
    if (!selectedDate) {
      await alert({
        title: 'Ошибка',
        message: 'Выберите дату на календаре.'
      });
      return;
    }

    onConfirm(selectedDate);
    onClose();
  };

  const hint = selectedDate
    ? selectedDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Выберите дату';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выбрать дату" showCloseButton>
      <div className="date-range-modal-body">
        <DateRangePicker
          mode="single"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          initialDisplayMonth={displayAnchor}
        />
        <p className="date-range-hint" aria-live="polite">
          {hint}
        </p>
        <button type="button" className="date-range-confirm-btn" onClick={handleConfirm}>
          Подтвердить
        </button>
      </div>
    </Modal>
  );
}

export default DatePickerModal;
