import React, { useEffect, useState } from 'react';
import {
  formatDateRangeDisplay,
  parseDateRangeDisplay
} from '../../lib/datePickerUtils';
import DateRangeModal from '../trainings/components/DateRangeModal';

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
 *   label: string,
 *   startDate: string,
 *   endDate: string,
 *   onChange: (range: { start: string, end: string }) => void
 * }} props
 */
function MembershipPeriodRangeField({ id, label, startDate, endDate, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [text, setText] = useState(() => formatDateRangeDisplay(startDate, endDate));

  useEffect(() => {
    setText(formatDateRangeDisplay(startDate, endDate));
  }, [startDate, endDate]);

  const openPicker = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setPickerOpen(true);
  };

  const handleBlur = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange({ start: '', end: '' });
      return;
    }
    const parsed = parseDateRangeDisplay(trimmed);
    if (parsed) {
      onChange(parsed);
      setText(formatDateRangeDisplay(parsed.start, parsed.end));
    } else {
      setText(formatDateRangeDisplay(startDate, endDate));
    }
  };

  const handleConfirm = (range) => {
    onChange(range);
    setText(formatDateRangeDisplay(range.start, range.end));
  };

  const defaultRange =
    startDate ? { start: startDate, end: endDate || startDate } : null;

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="membership-date-field-wrap">
        <input
          id={id}
          type="text"
          className="membership-date-field-input"
          placeholder="дд.мм.гггг - дд.мм.гггг"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={handleBlur}
          autoComplete="off"
        />
        <button
          type="button"
          className="membership-date-field-calendar-btn"
          aria-label="Выбрать период"
          onClick={openPicker}
        >
          <CalendarIcon />
        </button>
      </div>
      <DateRangeModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultRange={defaultRange}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default MembershipPeriodRangeField;
