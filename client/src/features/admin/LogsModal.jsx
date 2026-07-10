import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useModeratorLogs } from '../../hooks/useModeratorLogs';
import { formatModeratorLogEntry } from '../../lib/moderatorLogFormat';
import DateRangeModal from '../trainings/components/DateRangeModal';
import '../rating/Rating.css';
import '../trainings/Trainings.css';
import './LogsModal.css';

const DOMAIN_FILTER_OPTIONS = [
  { value: null, label: 'Все' },
  { value: 'ТРЕНИРОВКИ', label: 'Тренировки' },
  { value: 'АБОНЕМЕНТ', label: 'Абонемент' },
  { value: 'ПРОФИЛЬ', label: 'Профиль' },
  { value: 'РЕЙТИНГ', label: 'Рейтинг' },
  { value: 'АДМИНИСТРИРОВАНИЕ', label: 'Администрирование' }
];

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLogsDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

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
 * @param {{ entry: import('pocketbase').RecordModel }} props
 */
function LogRow({ entry }) {
  const { title, meta } = formatModeratorLogEntry(entry);

  return (
    <div className="logs-modal__row">
      <div className="logs-modal__row-title">{title}</div>
      <div className="logs-modal__row-meta">{meta}</div>
    </div>
  );
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
function LogsModal({ isOpen, onClose }) {
  const [dateRange, setDateRange] = useState(getLogsDefaultDateRange);
  const [domainFilter, setDomainFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);

  const { data: entries, isLoading, mutate } = useModeratorLogs(dateRange);

  useEffect(() => {
    if (!isOpen) return;
    mutate();
  }, [isOpen, mutate]);

  useEffect(() => {
    if (isOpen) return;
    setDomainFilter(null);
    setSearchQuery('');
    setDateRange(getLogsDefaultDateRange());
  }, [isOpen]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    let result = entries;

    if (domainFilter) {
      result = result.filter((entry) => entry.domain === domainFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;

    return result.filter((entry) => {
      if ((entry.actor_name || '').toLowerCase().includes(q)) return true;

      const details = entry.details || {};
      if (details.targetUserName && String(details.targetUserName).toLowerCase().includes(q)) {
        return true;
      }

      if (Array.isArray(details.targetUserNames)) {
        if (details.targetUserNames.some((name) => String(name).toLowerCase().includes(q))) {
          return true;
        }
      }

      if (details.fullName && String(details.fullName).toLowerCase().includes(q)) {
        return true;
      }

      return false;
    });
  }, [entries, domainFilter, searchQuery]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Логи"
        size="tall"
        className="logs-modal"
      >
        <div className="membership-search-row logs-modal__search-row">
          <input
            type="text"
            placeholder="Поиск по имени…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="rating-search-input"
          />
          <span className="membership-date-range-label">
            {formatDateRangeLabel(dateRange.start, dateRange.end)}
          </span>
          <IconButton
            type="button"
            ariaLabel="Выбрать период"
            aria-expanded={showDateModal}
            variant="ghost"
            className="membership-calendar-btn"
            onClick={() => setShowDateModal(true)}
          >
            <CalendarIcon />
          </IconButton>
        </div>

        <div className="logs-modal__domain-filters" role="group" aria-label="Фильтр по разделу">
          {DOMAIN_FILTER_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`logs-modal__domain-chip${domainFilter === option.value ? ' logs-modal__domain-chip--active' : ''}`}
              aria-pressed={domainFilter === option.value}
              onClick={() => setDomainFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Spinner label="Загрузка логов..." />
        ) : filteredEntries.length === 0 ? (
          <EmptyState title="Нет записей за выбранный период" />
        ) : (
          <div className="logs-modal__list">
            {filteredEntries.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </Modal>

      <DateRangeModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        defaultRange={dateRange}
        onConfirm={(range) => setDateRange(range)}
      />
    </>
  );
}

export default LogsModal;
