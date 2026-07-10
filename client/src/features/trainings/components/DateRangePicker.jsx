import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import { ru } from '@daypicker/react/locale';
import '@daypicker/react/style.css';
import '../Trainings.css';

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) =>
  new Date(2024, index, 1).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')
);

const YEARS_PER_PAGE = 12;

/**
 * @param {Date} date
 */
function startOfDecadePage(date) {
  const year = date.getFullYear();
  const pageStart = Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  return new Date(pageStart, 0, 1);
}

/**
 * @param {{
 *   selected: import('@daypicker/react').DateRange | undefined,
 *   onSelect: (range: import('@daypicker/react').DateRange | undefined) => void,
 *   defaultMonth?: Date
 * }} props
 */
function DateRangePicker({ selected, onSelect, defaultMonth = new Date() }) {
  const [view, setView] = useState('days');
  const [displayMonth, setDisplayMonth] = useState(defaultMonth);
  const [viewPhase, setViewPhase] = useState('enter');

  useEffect(() => {
    setDisplayMonth(defaultMonth);
    setView('days');
    setViewPhase('enter');
  }, [defaultMonth]);

  const switchView = useCallback((nextView) => {
    setViewPhase('exit');
    window.setTimeout(() => {
      setView(nextView);
      setViewPhase('enter');
    }, 150);
  }, []);

  const captionLabel = useMemo(
    () =>
      displayMonth.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric'
      }),
    [displayMonth]
  );

  const yearLabel = String(displayMonth.getFullYear());
  const decadeStart = startOfDecadePage(displayMonth).getFullYear();
  const decadeLabel = `${decadeStart}–${decadeStart + YEARS_PER_PAGE - 1}`;

  const handlePrev = () => {
    if (view === 'days') {
      setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
      return;
    }
    if (view === 'months') {
      setDisplayMonth((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
      return;
    }
    setDisplayMonth((prev) => new Date(prev.getFullYear() - YEARS_PER_PAGE, prev.getMonth(), 1));
  };

  const handleNext = () => {
    if (view === 'days') {
      setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      return;
    }
    if (view === 'months') {
      setDisplayMonth((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
      return;
    }
    setDisplayMonth((prev) => new Date(prev.getFullYear() + YEARS_PER_PAGE, prev.getMonth(), 1));
  };

  const handleSelectMonth = (monthIndex) => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), monthIndex, 1));
    switchView('days');
  };

  const handleSelectYear = (year) => {
    setDisplayMonth(new Date(year, displayMonth.getMonth(), 1));
    switchView('months');
  };

  const years = useMemo(() => {
    const start = startOfDecadePage(displayMonth).getFullYear();
    return Array.from({ length: YEARS_PER_PAGE }, (_, index) => start + index);
  }, [displayMonth]);

  const EmptyCaption = useCallback(() => null, []);

  return (
    <div className="date-range-picker-shell">
      <div className="date-range-picker-nav">
        <button
          type="button"
          className="date-range-picker-nav-btn"
          onClick={handlePrev}
          aria-label="Назад"
        >
          ‹
        </button>

        {view === 'days' ? (
          <button
            type="button"
            className="date-range-caption-btn"
            onClick={() => switchView('months')}
          >
            {captionLabel}
          </button>
        ) : null}

        {view === 'months' ? (
          <button
            type="button"
            className="date-range-caption-btn"
            onClick={() => switchView('years')}
          >
            {yearLabel}
          </button>
        ) : null}

        {view === 'years' ? (
          <span className="date-range-caption-label">{decadeLabel}</span>
        ) : null}

        <button
          type="button"
          className="date-range-picker-nav-btn"
          onClick={handleNext}
          aria-label="Вперёд"
        >
          ›
        </button>
      </div>

      <div
        className={`date-range-picker-view date-range-picker-view--${viewPhase}`}
        key={view}
      >
        {view === 'days' ? (
          <DayPicker
            animate
            mode="range"
            locale={ru}
            weekStartsOn={1}
            className="date-range-picker"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={selected}
            onSelect={onSelect}
            showOutsideDays
            hideNavigation
            components={{ MonthCaption: EmptyCaption, Nav: EmptyCaption }}
          />
        ) : null}

        {view === 'months' ? (
          <div className="date-range-month-grid" role="grid" aria-label="Выбор месяца">
            {MONTH_LABELS.map((label, index) => {
              const isCurrent =
                displayMonth.getMonth() === index &&
                displayMonth.getFullYear() === new Date().getFullYear();
              const isSelectedMonth =
                selected?.from &&
                selected.from.getMonth() === index &&
                selected.from.getFullYear() === displayMonth.getFullYear();
              return (
                <button
                  key={label}
                  type="button"
                  role="gridcell"
                  className={[
                    'date-range-month-cell',
                    isCurrent ? 'date-range-month-cell--today' : '',
                    isSelectedMonth ? 'date-range-month-cell--selected' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectMonth(index)}
                >
                  {label.replace(/^./, (char) => char.toUpperCase())}
                </button>
              );
            })}
          </div>
        ) : null}

        {view === 'years' ? (
          <div className="date-range-year-grid" role="grid" aria-label="Выбор года">
            {years.map((year) => {
              const isCurrent = year === new Date().getFullYear();
              const isSelectedYear =
                selected?.from && selected.from.getFullYear() === year;
              return (
                <button
                  key={year}
                  type="button"
                  role="gridcell"
                  className={[
                    'date-range-year-cell',
                    isCurrent ? 'date-range-year-cell--today' : '',
                    isSelectedYear ? 'date-range-year-cell--selected' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectYear(year)}
                >
                  {year}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DateRangePicker;
