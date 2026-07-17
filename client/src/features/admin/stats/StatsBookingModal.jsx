import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import { fetchStatsBooking } from '../../../services/stats';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import StatsMetricTitle from './StatsMetricTitle';
import '../Statistics.css';

/** @typedef {'total' | 'group' | 'tournament'} BookingSlice */
/** @typedef {'name' | 'booked' | 'cancelledTotal' | 'attended' | 'missed'} BookingSortField */
/** @typedef {{
 *   booked: number,
 *   cancelledTotal: number,
 *   cancelledSelf: number,
 *   cancelledModerator: number,
 *   cancelledSystem: number,
 *   attended: number,
 *   missed: number
 * }} StatsBookingCounters */
/** @typedef {{
 *   userId: string,
 *   fullName: string,
 *   group: StatsBookingCounters,
 *   tournament: StatsBookingCounters,
 *   total: StatsBookingCounters
 * }} StatsBookingUser */

/** @type {{ id: BookingSlice, label: string }[]} */
const SLICES = [
  { id: 'total', label: 'Всего' },
  { id: 'group', label: 'Групповые' },
  { id: 'tournament', label: 'Турниры' }
];

/**
 * @param {StatsBookingCounters | undefined} counters
 */
function hasAnyActivity(counters) {
  if (!counters) return false;
  return (
    counters.booked > 0 ||
    counters.cancelledTotal > 0 ||
    counters.attended > 0 ||
    counters.missed > 0
  );
}

/**
 * Метрика 1.3 — записи, отмены и явка по пользователям.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onBack: () => void
 * }} props
 */
export default function StatsBookingModal({ isOpen, onClose, onBack }) {
  const [range, setRange] = useState(getStatsDefaultDateRange);
  const [users, setUsers] = useState(/** @type {StatsBookingUser[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [searchQuery, setSearchQuery] = useState('');
  const [slice, setSlice] = useState(/** @type {BookingSlice} */ ('total'));
  const [sortField, setSortField] = useState(/** @type {BookingSortField} */ ('name'));
  const [sortDir, setSortDir] = useState(/** @type {'asc' | 'desc'} */ ('asc'));
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null));

  const load = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStatsBooking(period);
      setUsers(Array.isArray(result?.users) ? result.users : []);
    } catch (err) {
      console.error('[stats] booking', err);
      setUsers([]);
      setError(err?.message || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void load(range);
  }, [isOpen, range, load]);

  useEffect(() => {
    if (isOpen) return;
    setSearchQuery('');
    setSlice('total');
    setSortField('name');
    setSortDir('asc');
    setExpandedId(null);
  }, [isOpen]);

  const handleRangeChange = useCallback((next) => {
    setRange(next);
  }, []);

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    },
    [sortField]
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = users.filter((row) => hasAnyActivity(row[slice]));
    if (q) {
      list = list.filter((row) => (row.fullName || '').toLowerCase().includes(q));
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = (a.fullName || '').localeCompare(b.fullName || '', 'ru');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const av = a[slice]?.[sortField] ?? 0;
      const bv = b[slice]?.[sortField] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return sorted;
  }, [users, searchQuery, slice, sortField, sortDir]);

  const isEmpty = !loading && !error && users.length === 0;
  const isFilteredEmpty = !loading && !error && users.length > 0 && filteredUsers.length === 0;

  /**
   * @param {BookingSortField} field
   * @param {string} label
   */
  const renderSortHeader = (field, label) => (
    <button type="button" className="stats-booking__th sortable" onClick={() => handleSort(field)}>
      {label}
      {sortField === field ? (
        <span className="stats-booking__sort" aria-hidden="true">
          {sortDir === 'desc' ? '▼' : '▲'}
        </span>
      ) : null}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<StatsMetricTitle onBack={onBack}>Записи и посещаемость</StatsMetricTitle>}
      className="stats-metric-modal stats-booking-modal"
      size="tall"
    >
      <StatsPeriodToolbar range={range} onChange={handleRangeChange} />

      <div className="stats-booking__search-row">
        <input
          type="text"
          placeholder="Поиск по имени…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="stats-booking__search-input"
        />
      </div>

      <div className="stats-booking__slices" role="group" aria-label="Тип тренировки">
        {SLICES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              slice === item.id
                ? 'stats-booking__slice stats-booking__slice--active'
                : 'stats-booking__slice'
            }
            onClick={() => {
              setSlice(item.id);
              setExpandedId(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && users.length === 0 ? (
        <Spinner label="Загрузка…" />
      ) : error ? (
        <EmptyState title="Ошибка загрузки" description={error} />
      ) : isEmpty ? (
        <EmptyState
          title="Нет данных"
          description="За выбранный период записей, отмен и посещений не было."
        />
      ) : isFilteredEmpty ? (
        <EmptyState
          title="Никого не найдено"
          description="Измените поиск или переключатель типа тренировки."
        />
      ) : (
        <div className="stats-booking__table">
          <div className="stats-booking__header" role="row">
            {renderSortHeader('name', 'Игрок')}
            {renderSortHeader('booked', 'Зап.')}
            {renderSortHeader('cancelledTotal', 'Отм.')}
            {renderSortHeader('attended', 'Явка')}
            {renderSortHeader('missed', 'Проп.')}
          </div>

          {filteredUsers.map((row) => {
            const counters = row[slice];
            const expanded = expandedId === row.userId;
            return (
              <div key={row.userId} className="stats-booking__block">
                <button
                  type="button"
                  className={
                    expanded
                      ? 'stats-booking__row stats-booking__row--expanded'
                      : 'stats-booking__row'
                  }
                  onClick={() =>
                    setExpandedId((current) => (current === row.userId ? null : row.userId))
                  }
                  aria-expanded={expanded}
                >
                  <span className="stats-booking__name">{row.fullName || 'Без имени'}</span>
                  <span className="stats-booking__num">{counters.booked}</span>
                  <span className="stats-booking__num">{counters.cancelledTotal}</span>
                  <span className="stats-booking__num">{counters.attended}</span>
                  <span className="stats-booking__num">{counters.missed}</span>
                </button>
                {expanded ? (
                  <div className="stats-booking__details">
                    <div className="stats-booking__detail-title">Отмены</div>
                    <dl className="stats-booking__detail-list">
                      <div className="stats-booking__detail-item">
                        <dt>Самостоятельно</dt>
                        <dd>{counters.cancelledSelf}</dd>
                      </div>
                      <div className="stats-booking__detail-item">
                        <dt>Модератор</dt>
                        <dd>{counters.cancelledModerator}</dd>
                      </div>
                      <div className="stats-booking__detail-item">
                        <dt>Система</dt>
                        <dd>{counters.cancelledSystem}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </div>
            );
          })}

          {loading ? <p className="stats-booking__refresh">Обновление…</p> : null}
        </div>
      )}
    </Modal>
  );
}
