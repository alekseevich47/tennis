import React, { useState } from 'react';
import IconButton from '../../components/ui/IconButton';
import { parseDateInputValue, toDateInputValue } from '../../lib/datePickerUtils';
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
 *   label: string,
 *   value: string,
 *   onChange: (value: string) => void
 * }} props
 */
function ProfileSingleDateField({ id, label, value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const defaultDate = value ? parseDateInputValue(value) : null;

  const handleConfirm = (date) => {
    onChange(toDateInputValue(date));
  };

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="profile-date-field-row">
        <input
          id={id}
          type="date"
          className="profile-date-field-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <IconButton
          type="button"
          ariaLabel={`Выбрать ${label.toLowerCase()} в календаре`}
          aria-expanded={pickerOpen}
          variant="ghost"
          className="profile-date-field-calendar-btn"
          onClick={() => setPickerOpen(true)}
        >
          <CalendarIcon />
        </IconButton>
      </div>
      <DatePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultDate={defaultDate}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default ProfileSingleDateField;
