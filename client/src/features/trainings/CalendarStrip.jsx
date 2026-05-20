import React, { memo, useCallback } from 'react';
import clsx from 'clsx';
import { DAYS_SHORT, isSameDay } from '../../lib/format';

/**
 * @param {{
 *   days: Date[],
 *   selectedDate: Date,
 *   onSelect: (date: Date) => void,
 *   dayStatusMap: Map<string, { hasGroup: boolean, hasTournament: boolean, isEmpty: boolean }>,
 *   keyOf: (date: Date) => string
 * }} props
 */
function CalendarStrip({ days, selectedDate, onSelect, dayStatusMap, keyOf }) {
  const handleClick = useCallback(
    (date) => () => onSelect(date),
    [onSelect]
  );
  const calendarRows = [days.slice(0, 7), days.slice(7, 14)];

  return (
    <div className="calendar-strip" role="tablist" aria-label="Дни расписания на 14 дней">
      {calendarRows.map((row, rowIndex) => (
        <div className="calendar-row" role="presentation" key={rowIndex}>
          {row.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const status = dayStatusMap.get(keyOf(date)) || {
              hasGroup: false,
              hasTournament: false,
              isEmpty: true
            };
            return (
              <button
                key={keyOf(date)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={clsx('calendar-day-item', isSelected && 'active-day')}
                onClick={handleClick(date)}
              >
                <span className="day-name-label">{DAYS_SHORT[date.getDay()]}</span>
                <span className="day-num-label">{date.getDate()}</span>
                <div className="dots-indicator-container" aria-hidden="true">
                  {status.isEmpty && <div className="date-status-dot dot-gray" />}
                  {status.hasGroup && <div className="date-status-dot dot-blue" />}
                  {status.hasTournament && <div className="date-status-dot dot-red" />}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default memo(CalendarStrip);
