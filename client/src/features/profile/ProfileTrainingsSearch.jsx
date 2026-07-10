import React, { useState } from 'react';
import IconButton from '../../components/ui/IconButton';
import { isDateQueryParsed, matchesDateQuery, parseDateQuery } from '../../lib/dateSearch';
import { formatCardDateWithYear } from '../../lib/format';
import DateRangeModal, { getArchiveDefaultDateRange } from '../trainings/components/DateRangeModal';

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
 * @param {any[]} trainings
 * @param {{ searchDate: string, dateRange: { start: string, end: string } | null }} filters
 */
export function filterProfileTrainings(trainings, { searchDate, dateRange }) {
  let list = trainings;
  const hasDateFilter = Boolean(dateRange?.start && dateRange?.end);

  if (hasDateFilter) {
    const { start, end } = dateRange;
    list = list.filter((training) => {
      const date = training.date?.slice(0, 10);
      return date && date >= start && date <= end;
    });
  }

  if (!searchDate.trim()) return list;

  const q = searchDate.trim();
  const parsed = parseDateQuery(q);
  if (isDateQueryParsed(parsed)) {
    return list.filter((training) => matchesDateQuery(training.date, parsed));
  }

  const qLower = q.toLowerCase();
  return list.filter((training) =>
    formatCardDateWithYear(training.date).toLowerCase().includes(qLower)
  );
}

/**
 * @param {{
 *   searchDate: string,
 *   onSearchDateChange: (value: string) => void,
 *   dateRange: { start: string, end: string } | null,
 *   onDateRangeChange: (range: { start: string, end: string } | null) => void
 * }} props
 */
function ProfileTrainingsSearch({
  searchDate,
  onSearchDateChange,
  dateRange,
  onDateRangeChange
}) {
  const [showDateModal, setShowDateModal] = useState(false);
  const hasDateFilter = Boolean(dateRange?.start && dateRange?.end);

  return (
    <>
      <div className="profile-trainings-search-row">
        <div className="profile-trainings-search-field">
          <input
            type="text"
            className="profile-trainings-search-input"
            placeholder="Поиск по дате..."
            value={searchDate}
            onChange={(event) => onSearchDateChange(event.target.value)}
            aria-label="Поиск тренировок по дате"
          />
          {searchDate ? (
            <IconButton
              ariaLabel="Очистить поиск"
              variant="ghost"
              size="sm"
              className="profile-trainings-search-clear"
              onClick={() => onSearchDateChange('')}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          ) : null}
        </div>
        <IconButton
          type="button"
          ariaLabel="Выбрать период"
          aria-expanded={showDateModal}
          variant="ghost"
          className="profile-trainings-calendar-btn"
          onClick={() => setShowDateModal(true)}
        >
          <CalendarIcon />
        </IconButton>
      </div>
      {hasDateFilter ? (
        <div className="profile-trainings-date-range-row">
          <span className="profile-trainings-date-range-label">
            {formatDateRangeLabel(dateRange.start, dateRange.end)}
          </span>
          <IconButton
            type="button"
            ariaLabel="Сбросить фильтр по датам"
            variant="ghost"
            size="sm"
            className="profile-trainings-date-reset-btn"
            onClick={() => onDateRangeChange(null)}
          >
            <span aria-hidden="true">✕</span>
          </IconButton>
        </div>
      ) : null}
      <DateRangeModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        defaultRange={dateRange || getArchiveDefaultDateRange()}
        onConfirm={(range) => onDateRangeChange(range)}
      />
    </>
  );
}

export default ProfileTrainingsSearch;
