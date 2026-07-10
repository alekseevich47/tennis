import React, { useEffect, useState } from 'react';
import {
  formatDateDisplay,
  maskDateInput,
  parseDateDisplay,
  toDateInputValue
} from '../../lib/datePickerUtils';
import DatePickerModal from '../trainings/components/DatePickerModal';

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/**
 * @param {{
 *   id: string,
 *   label?: string,
 *   value: string,
 *   onChange: (value: string) => void
 * }} props
 */
function MembershipStartDateField({ id, label = 'Начало периода', value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [text, setText] = useState(() => formatDateDisplay(value));

  useEffect(() => {
    setText(formatDateDisplay(value));
  }, [value]);

  const openPicker = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setPickerOpen(true);
  };

  const handleBlur = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange('');
      return;
    }
    const parsed = parseDateDisplay(trimmed);
    if (parsed) {
      onChange(parsed);
      setText(formatDateDisplay(parsed));
    } else {
      setText(formatDateDisplay(value));
    }
  };

  const handleConfirm = (date) => {
    const next = toDateInputValue(date);
    onChange(next);
    setText(formatDateDisplay(next));
  };

  const handleChange = (event) => {
    setText(maskDateInput(event.target.value));
  };

  const handleKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="membership-date-field-wrap">
        <input
          id={id}
          type="text"
          className="membership-date-field-input"
          placeholder="дд.мм.гггг"
          inputMode="numeric"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoComplete="off"
        />
        <button
          type="button"
          className="membership-date-field-calendar-btn"
          aria-label="Выбрать дату"
          onClick={openPicker}
        >
          <CalendarIcon />
        </button>
      </div>
      <DatePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultDate={value || null}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default MembershipStartDateField;
