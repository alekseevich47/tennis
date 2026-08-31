import React from 'react';
import clsx from 'clsx';
import DaySeparator from './DaySeparator';

/**
 * Группа элементов одного дня — контейнер для sticky-бейджа даты.
 * @param {{
 *   label: string,
 *   variant?: 'feed' | 'comments',
 *   className?: string,
 *   children: React.ReactNode
 * }} props
 */
export default function DayGroup({ label, variant = 'feed', className = '', children }) {
  return (
    <div className={clsx('day-group', `day-group--${variant}`, className)}>
      <DaySeparator label={label} />
      {children}
    </div>
  );
}
