import React, { useMemo, useState } from 'react';
import EmptyState from '../../../components/ui/EmptyState';
import IconButton from '../../../components/ui/IconButton';
import Modal from '../../../components/ui/Modal';
import { isDateQueryParsed, matchesDateQuery, parseDateQuery } from '../../../lib/dateSearch';
import { formatCardDateWithYear, formatTimeRange } from '../../../lib/format';
import DateRangeModal from './DateRangeModal';
import '../Trainings.css';

/** @typedef {'all' | 'completed' | 'cancelled'} ArchiveCategory */

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
 * @param {{
 *   isOpen: boolean,
 *   trainings: any[],
 *   onClose: () => void,
 *   onOpenDetail: (training: any) => void
 * }} props
 */
function ArchiveModal({ isOpen, trainings, onClose, onOpenDetail }) {
  const [searchQuery, setSearchQuery] = useState('');
  /** @type {[ArchiveCategory, React.Dispatch<React.SetStateAction<ArchiveCategory>>]} */
  const [category, setCategory] = useState(/** @type {ArchiveCategory} */ ('all'));
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  const hasDateFilter = Boolean(dateRange?.start && dateRange?.end);

  const filtered = useMemo(() => {
    let list = trainings.filter((training) => {
      if (category === 'cancelled') return training.is_cancelled === true;
      if (category === 'completed') return training.is_cancelled !== true;
      return true;
    });

    if (hasDateFilter) {
      const { start, end } = dateRange;
      list = list.filter((training) => {
        const date = training.date?.slice(0, 10);
        return date && date >= start && date <= end;
      });
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.trim();
    const parsed = parseDateQuery(q);
    if (isDateQueryParsed(parsed)) {
      return list.filter((training) => matchesDateQuery(training.date, parsed));
    }

    const qLower = q.toLowerCase();
    return list.filter((training) =>
      formatCardDateWithYear(training.date).toLowerCase().includes(qLower)
    );
  }, [trainings, searchQuery, category, dateRange, hasDateFilter]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Архив тренировок"
      ariaLabel="Список прошедших тренировок"
    >
      <div className="archive-search-wrapper">
        <div className="archive-search-field">
          <input
            type="text"
            className="archive-search-input"
            placeholder="Поиск по дате..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Поиск тренировок по дате"
          />
          {searchQuery ? (
            <IconButton
              ariaLabel="Очистить поиск"
              variant="ghost"
              size="sm"
              className="archive-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          ) : null}
        </div>
        <IconButton
          type="button"
          ariaLabel="Выбрать период"
          aria-expanded={showDateRangeModal}
          variant="ghost"
          className="archive-calendar-btn"
          onClick={() => setShowDateRangeModal(true)}
        >
          <CalendarIcon />
        </IconButton>
        <select
          className="archive-category-select"
          value={category}
          onChange={(e) => setCategory(/** @type {ArchiveCategory} */ (e.target.value))}
          aria-label="Фильтр по категории"
        >
          <option value="all">Все</option>
          <option value="completed">Завершённые</option>
          <option value="cancelled">Отменённые</option>
        </select>
      </div>
      {hasDateFilter ? (
        <div className="archive-date-range-row">
          <span className="archive-date-range-label">
            {formatDateRangeLabel(dateRange.start, dateRange.end)}
          </span>
          <IconButton
            type="button"
            ariaLabel="Сбросить фильтр по датам"
            variant="ghost"
            size="sm"
            className="archive-date-reset-btn"
            onClick={() => setDateRange(null)}
          >
            <span aria-hidden="true">✕</span>
          </IconButton>
        </div>
      ) : null}
      <div className="archive-list">
        {filtered.length === 0 ? (
          <EmptyState title="Пусто" description="Прошедших тренировок пока нет." />
        ) : (
          filtered.map((training) => {
            const isCancelled = training.is_cancelled === true;
            return (
              <div
                key={training.id}
                className="training-row-card archive-card"
                onClick={() => onOpenDetail(training)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenDetail(training);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Тренировка ${formatCardDateWithYear(training.date)}, ${formatTimeRange(training.date, training.duration)}`}
              >
                <div className="card-main-info-col">
                  <span className="card-row-date">{formatCardDateWithYear(training.date)}</span>
                  <span className="card-row-time">
                    {formatTimeRange(training.date, training.duration)}
                  </span>
                  <span className="card-row-type-label">
                    {training.type === 'group' ? 'Тренировка' : 'Турнир секции'}
                  </span>
                </div>

                <div className="card-actions-info-col">
                  <span
                    className={
                      isCancelled
                        ? 'card-status-badge card-status-badge--cancelled'
                        : 'card-status-badge card-status-badge--closed'
                    }
                  >
                    {isCancelled ? 'Отменена' : 'Тренировка завершена'}
                  </span>
                  <span className="card-slots-counter">
                    {training.booked_users?.length || 0} участников
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DateRangeModal
        isOpen={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        onConfirm={(range) => setDateRange(range)}
      />
    </Modal>
  );
}

export default ArchiveModal;
