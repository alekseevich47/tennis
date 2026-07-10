import React, { useRef, useState } from 'react';
import { parseDateInputValue, toDateInputValue } from '../../lib/datePickerUtils';
import DatePickerModal from '../trainings/components/DatePickerModal';

const PICKER_ZONE_WIDTH = 40;

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
  const inputRef = useRef(null);

  const isPickerZoneClick = (event) => {
    const input = inputRef.current;
    if (!input) return false;
    const rect = input.getBoundingClientRect();
    return event.clientX >= rect.right - PICKER_ZONE_WIDTH;
  };

  const openPicker = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setPickerOpen(true);
  };

  const handleInputPointerDown = (event) => {
    if (isPickerZoneClick(event)) openPicker(event);
  };

  const handleInputClick = (event) => {
    if (isPickerZoneClick(event)) openPicker(event);
  };

  const handleConfirm = (date) => {
    onChange(toDateInputValue(date));
  };

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="profile-date-field-wrap">
        <input
          ref={inputRef}
          id={id}
          type="date"
          className="profile-date-field-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPointerDown={handleInputPointerDown}
          onClick={handleInputClick}
        />
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

export default ProfileSingleDateField;
