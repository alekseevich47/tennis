import React, { useState } from 'react';
import IconButton from '../../../components/ui/IconButton';
import { toDateInputValue } from '../../../lib/datePickerUtils';
import DateRangeModal from '../../trainings/components/DateRangeModal';
import '../Statistics.css';

/**
 * Дефолт периода статистики: последние 30 дней (как в LogsModal).
 * @returns {{ start: string, end: string }}
 */
export function getStatsDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

/**
 * @param {string} start
 * @param {string} end
 */
function formatDateRangeLabel(start, end) {
  const fmt = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/**
 * Тулбар выбора периода для модалок статистики.
 *
 * @param {{
 *   range: { start: string, end: string },
 *   onChange: (range: { start: string, end: string }) => void,
 *   className?: string,
 *   leading?: React.ReactNode
 * }} props
 */
export default function StatsPeriodToolbar({ range, onChange, className, leading = null }) {
  const [showDateModal, setShowDateModal] = useState(false);

  return (
    <>
      <div
        className={
          className
            ? `stats-period-toolbar ${className}`
            : 'stats-period-toolbar'
        }
      >
        {leading ? <div className="stats-period-toolbar__leading">{leading}</div> : null}
        <span className="stats-period-toolbar__spacer" aria-hidden="true" />
        <span className="stats-period-toolbar__label">
          {formatDateRangeLabel(range.start, range.end)}
        </span>
        <IconButton
          type="button"
          ariaLabel="Выбрать период"
          aria-expanded={showDateModal}
          variant="ghost"
          className="stats-period-toolbar__calendar"
          onClick={() => setShowDateModal(true)}
        >
          <CalendarIcon />
        </IconButton>
      </div>

      <DateRangeModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        defaultRange={range}
        onConfirm={onChange}
      />
    </>
  );
}
