import React, { useId } from 'react';
import clsx from 'clsx';
import './Toggle.css';

/**
 * @param {{
 *   checked: boolean,
 *   onChange: (checked: boolean) => void,
 *   disabled?: boolean,
 *   className?: string,
 *   ariaLabel?: string
 * }} props
 */
export default function Toggle({
  checked,
  onChange,
  disabled = false,
  className,
  ariaLabel
}) {
  const id = useId();

  return (
    <label className={clsx('ui-toggle', className)} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="ui-toggle__input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ui-toggle__track" aria-hidden="true" />
    </label>
  );
}
