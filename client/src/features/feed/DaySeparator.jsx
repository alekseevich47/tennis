import React from 'react';
import clsx from 'clsx';

/**
 * Sticky-бейдж даты (лента / комментарии).
 * @param {{ label: string, className?: string }} props
 */
export default function DaySeparator({ label, className = '' }) {
  return (
    <div className={clsx('day-separator', className)} role="separator">
      <span className="day-separator__pill">
        <span className="day-separator__label">{label}</span>
      </span>
    </div>
  );
}
