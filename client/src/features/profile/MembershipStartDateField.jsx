import React, { useEffect, useMemo, useState } from 'react';
import {
  formatDateDisplay,
  maskDateInput,
  parseDateDisplay,
  parseDateInputValue,
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
 * @param {string | null | undefined} maxDate YYYY-MM-DD
 * @param {string} iso YYYY-MM-DD
 */
function exceedsMaxDate(maxDate, iso) {
  if (!maxDate || !iso) return false;
  return iso > String(maxDate).slice(0, 10);
}

/**
 * @param {{
 *   id: string,
 *   label?: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   required?: boolean,
 *   maxDate?: string | null
 * }} props
 */
function MembershipStartDateField({
  id,
  label = 'Начало периода',
  value,
  onChange,
  required = false,
  maxDate = null
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [text, setText] = useState(() => formatDateDisplay(value));

  const pickerDisabled = useMemo(() => {
    if (!maxDate) return undefined;
    try {
      return { after: parseDateInputValue(String(maxDate).slice(0, 10)) };
    } catch {
      return undefined;
    }
  }, [maxDate]);

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
    if (parsed && !exceedsMaxDate(maxDate, parsed)) {
      onChange(parsed);
      setText(formatDateDisplay(parsed));
      return;
    }
    setText(formatDateDisplay(value));
  };

  const handleConfirm = (date) => {
    const next = toDateInputValue(date);
    if (exceedsMaxDate(maxDate, next)) return;
    onChange(next);
    setText(formatDateDisplay(next));
  };

  const handleChange = (event) => {
    const next = maskDateInput(event.target.value);
    setText(next);
    const parsed = parseDateDisplay(next);
    if (parsed && !exceedsMaxDate(maxDate, parsed)) {
      onChange(parsed);
    }
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
          required={required}
          aria-required={required || undefined}
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
        disabled={pickerDisabled}
      />
    </div>
  );
}

export default MembershipStartDateField;
