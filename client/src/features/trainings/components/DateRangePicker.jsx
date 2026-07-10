import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import { ru } from '@daypicker/react/locale';
import '@daypicker/react/style.css';
import '../Trainings.css';

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) =>
  new Date(2024, index, 1).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')
);

const YEARS_PER_PAGE = 12;
const SWIPE_THRESHOLD = 50;

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
 *   mode?: 'single' | 'range',
 *   selectedRange?: import('@daypicker/react').DateRange | undefined,
 *   selectedDate?: Date | undefined,
 *   onSelectRange?: (range: import('@daypicker/react').DateRange | undefined) => void,
 *   onSelectDate?: (date: Date | undefined) => void,
 *   initialDisplayMonth?: Date
 * }} props
 */
function DateRangePicker({
  mode = 'range',
  selectedRange,
  selectedDate,
  onSelectRange,
  onSelectDate,
  initialDisplayMonth = new Date()
}) {
  const [view, setView] = useState('days');
  const [displayMonth, setDisplayMonth] = useState(initialDisplayMonth);
  const [viewPhase, setViewPhase] = useState('enter');
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setDisplayMonth(initialDisplayMonth);
    setView('days');
    setViewPhase('enter');
  }, [initialDisplayMonth]);

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

  const handlePrev = useCallback(() => {
    if (view === 'days') {
      setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
      return;
    }
    if (view === 'months') {
      setDisplayMonth((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
      return;
    }
    setDisplayMonth((prev) => new Date(prev.getFullYear() - YEARS_PER_PAGE, prev.getMonth(), 1));
  }, [view]);

  const handleNext = useCallback(() => {
    if (view === 'days') {
      setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      return;
    }
    if (view === 'months') {
      setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      return;
    }
    setDisplayMonth((prev) => new Date(prev.getFullYear() + YEARS_PER_PAGE, prev.getMonth(), 1));
  }, [view]);

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

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX > 0) handlePrev();
    else handleNext();
  };

  const selectedMonthIndex =
    mode === 'single'
      ? selectedDate?.getMonth()
      : selectedRange?.from?.getMonth();
  const selectedYear =
    mode === 'single' ? selectedDate?.getFullYear() : selectedRange?.from?.getFullYear();

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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {view === 'days' ? (
          <DayPicker
            animate
            autoFocus
            mode={mode}
            locale={ru}
            weekStartsOn={1}
            className="date-range-picker"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={mode === 'single' ? selectedDate : selectedRange}
            onSelect={mode === 'single' ? onSelectDate : onSelectRange}
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
                selectedMonthIndex === index &&
                selectedYear === displayMonth.getFullYear();
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
              const isSelectedYear = selectedYear === year;
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
