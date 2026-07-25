import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { usePlayers } from '../../hooks/usePlayers';
import {
  AUDIT_EVENT_CATEGORIES,
  AUDIT_OBJECT_TYPES,
  exportAuditEvents
} from '../../services/auditLog';
import { formatAuditEventDetails, formatAuditEventPreview } from '../../lib/auditEventFormat';
import DateRangeModal from '../trainings/components/DateRangeModal';
import exportIconUrl from '../../assets/icon_export.png';
import '../rating/Rating.css';
import '../trainings/Trainings.css';
import './LogsModal.css';

const ALL_CATEGORY_VALUES = AUDIT_EVENT_CATEGORIES.map((item) => item.value);
const PER_PAGE_STEP = 30;

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
 * @param {{ label: string, value: string, copyValue?: string }} props
 */
function AuditDetailValue({ value, copyValue }) {
  const textToCopy = copyValue ?? value;

  const handleCopy = useCallback(async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // копирование не блокирует UI
    }
  }, [textToCopy]);

  if (!copyValue) {
    return value;
  }

  return (
    <button type="button" className="logs-modal__copyable" onClick={handleCopy}>
      {value}
    </button>
  );
}

/**
 * @param {{ entry: import('pocketbase').RecordModel, expanded: boolean, onToggle: () => void }} props
 */
function AuditEventRow({ entry, expanded, onToggle }) {
  const { title, meta, color, categoryLabel } = formatAuditEventPreview(entry);
  const { sections, details } = formatAuditEventDetails(entry);

  return (
    <div
      className={`logs-modal__row${expanded ? ' logs-modal__row--expanded' : ''}`}
    >
      <button
        type="button"
        className="logs-modal__row-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span
          className="logs-modal__row-accent"
          style={{ backgroundColor: color }}
          title={categoryLabel}
          aria-hidden="true"
        />
        <span className="logs-modal__row-content">
          <span className="logs-modal__row-title">{title}</span>
          <span className="logs-modal__row-meta">{meta}</span>
        </span>
        <span className="logs-modal__row-chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        <div className="logs-modal__row-details">
          {sections.map((section) => (
            <div key={section.title} className="logs-modal__detail-section">
              <div className="logs-modal__detail-section-title">{section.title}</div>
              <dl className="logs-modal__detail-list">
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.label}`} className="logs-modal__detail-item">
                    <dt>{item.label}</dt>
                    <dd>
                      <AuditDetailValue
                        value={item.value}
                        copyValue={item.copyValue}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {details ? (
            <div className="logs-modal__detail-section">
              <div className="logs-modal__detail-section-title">Технические детали</div>
              <pre className="logs-modal__details-json">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
function LogsModal({ isOpen, onClose }) {
  const { data: players = [] } = usePlayers();

  const [dateRange, setDateRange] = useState(getLogsDefaultDateRange);
  const [selectedCategories, setSelectedCategories] = useState(
    () => new Set(ALL_CATEGORY_VALUES)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [objectType, setObjectType] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [perPage, setPerPage] = useState(PER_PAGE_STEP);
  const [expandedId, setExpandedId] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(() => {
    let categories;
    if (selectedCategories.size === 0) {
      // пустой выбор → заведомо пустой результат (без category-фильтра PB вернул бы всё)
      categories = ['__none__'];
    } else if (selectedCategories.size !== ALL_CATEGORY_VALUES.length) {
      categories = Array.from(selectedCategories);
    }

    return {
      dateRange,
      categories,
      objectType: objectType || null,
      subjectId: subjectId || null,
      search: searchQuery.trim() || undefined
    };
  }, [dateRange, selectedCategories, objectType, subjectId, searchQuery]);

  const { items, totalItems, isLoading, isValidating, mutate } = useAuditEvents(filters, 1, perPage);

  useEffect(() => {
    if (!isOpen) return;
    mutate();
  }, [isOpen, mutate]);

  useEffect(() => {
    if (isOpen) return;
    setSelectedCategories(new Set(ALL_CATEGORY_VALUES));
    setSearchQuery('');
    setObjectType('');
    setSubjectInput('');
    setSubjectId('');
    setPerPage(PER_PAGE_STEP);
    setExpandedId(null);
    setDateRange(getLogsDefaultDateRange());
  }, [isOpen]);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    setPerPage(PER_PAGE_STEP);
    setExpandedId(null);
  }, [filtersKey]);

  const allCategoriesSelected =
    selectedCategories.size === ALL_CATEGORY_VALUES.length;

  const toggleCategory = useCallback((value) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const toggleAllCategories = useCallback(() => {
    setSelectedCategories((prev) =>
      prev.size === ALL_CATEGORY_VALUES.length
        ? new Set()
        : new Set(ALL_CATEGORY_VALUES)
    );
  }, []);

  const handleSubjectInputChange = useCallback(
    (event) => {
      const value = event.target.value;
      setSubjectInput(value);
      const match = players.find(
        (player) => (player.full_name || '').toLowerCase() === value.trim().toLowerCase()
      );
      setSubjectId(match?.id || '');
    },
    [players]
  );

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportAuditEvents(filters);
    } catch {
      // экспорт не блокирует UI
    } finally {
      setExporting(false);
    }
  }, [exporting, filters]);

  const hasMore = items.length < totalItems;
  const noCategoriesSelected = selectedCategories.size === 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Логи"
        size="tall"
        className="logs-modal"
        headerActions={(
          <IconButton
            type="button"
            ariaLabel={exporting ? 'Экспорт…' : 'Экспорт CSV'}
            variant="ghost"
            onClick={handleExport}
            disabled={exporting || noCategoriesSelected}
          >
            <img
              src={exportIconUrl}
              alt=""
              className="logs-modal__export-icon"
              width={18}
              height={18}
              aria-hidden="true"
            />
          </IconButton>
        )}
      >
        <div className="membership-search-row logs-modal__search-row">
          <input
            type="text"
            placeholder="Поиск по тексту, именам, ID…"
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

        <div className="logs-modal__extra-filters">
          <label className="logs-modal__filter-field">
            <span className="logs-modal__filter-label">Субъект</span>
            <input
              type="text"
              list="logs-subject-options"
              placeholder="Имя пользователя"
              value={subjectInput}
              onChange={handleSubjectInputChange}
              className="rating-search-input"
            />
            <datalist id="logs-subject-options">
              {players.map((player) => (
                <option key={player.id} value={player.full_name || ''} />
              ))}
            </datalist>
          </label>

          <label className="logs-modal__filter-field">
            <span className="logs-modal__filter-label">Объект</span>
            <select
              value={objectType}
              onChange={(event) => setObjectType(event.target.value)}
              className="logs-modal__object-select"
            >
              <option value="">Все типы</option>
              {AUDIT_OBJECT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="logs-modal__domain-filters" role="group" aria-label="Фильтр по разделу">
          <button
            type="button"
            className={`logs-modal__domain-chip${
              allCategoriesSelected ? ' logs-modal__domain-chip--active' : ''
            }`}
            aria-pressed={allCategoriesSelected}
            onClick={toggleAllCategories}
          >
            Все
          </button>
          {AUDIT_EVENT_CATEGORIES.map((option) => {
            const active = selectedCategories.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`logs-modal__domain-chip${
                  active ? ' logs-modal__domain-chip--active' : ''
                }`}
                style={
                  active
                    ? { backgroundColor: option.color, borderColor: option.color }
                    : undefined
                }
                aria-pressed={active}
                onClick={() => toggleCategory(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {!isLoading && totalItems > 0 && !noCategoriesSelected ? (
          <div className="logs-modal__toolbar">
            <span className="logs-modal__count">
              {items.length} из {totalItems}
            </span>
          </div>
        ) : null}

        {noCategoriesSelected ? (
          <EmptyState title="Выберите хотя бы один раздел" />
        ) : isLoading && items.length === 0 ? (
          <Spinner label="Загрузка логов..." />
        ) : items.length === 0 ? (
          <EmptyState title="Нет записей за выбранный период" />
        ) : (
          <>
            <div className="logs-modal__list">
              {items.map((entry) => (
                <AuditEventRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === entry.id ? null : entry.id))
                  }
                />
              ))}
            </div>
            {hasMore ? (
              <button
                type="button"
                className="logs-modal__load-more"
                onClick={() => {
                  if (isValidating) return;
                  setPerPage((prev) => prev + PER_PAGE_STEP);
                }}
                aria-busy={isValidating || undefined}
              >
                {isValidating ? 'Загрузка…' : `Показать ещё (${totalItems - items.length})`}
              </button>
            ) : null}
          </>
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
