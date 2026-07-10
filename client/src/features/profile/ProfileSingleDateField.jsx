import React from 'react';
import DateRangePicker from '../trainings/components/DateRangePicker';
import { parseDateInputValue, toDateInputValue } from '../../lib/datePickerUtils';

/**
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   initialDisplayMonth: Date
 * }} props
 */
function ProfileSingleDateField({ label, value, onChange, initialDisplayMonth }) {
  const selectedDate = value ? parseDateInputValue(value) : undefined;

  const handleSelect = (date) => {
    onChange(date ? toDateInputValue(date) : '');
  };

  return (
    <div className="form-group membership-calendar-group">
      <span className="form-group-label">{label}</span>
      <DateRangePicker
        mode="single"
        selectedDate={selectedDate}
        onSelectDate={handleSelect}
        initialDisplayMonth={initialDisplayMonth}
      />
    </div>
  );
}

export default ProfileSingleDateField;
