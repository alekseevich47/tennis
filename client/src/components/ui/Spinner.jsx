import React from 'react';
import clsx from 'clsx';
import './Spinner.css';

/**
 * @param {{ label?: string, className?: string, inline?: boolean }} props
 */
function Spinner({ label = 'Загрузка...', className, inline = false }) {
  return (
    <div
      className={clsx('ui-spinner-wrap', inline && 'ui-spinner-inline', className)}
      role="status"
      aria-live="polite"
    >
      <span className="ui-spinner" aria-hidden="true" />
      <span className="ui-spinner-label">{label}</span>
    </div>
  );
}

export default Spinner;
