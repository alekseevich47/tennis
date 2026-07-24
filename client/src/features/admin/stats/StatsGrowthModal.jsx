import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import Avatar from '../../../components/ui/Avatar';
import ProfileViewModal from '../../profile/ProfileViewModal';
import { getCurrentUser } from '../../../services/auth';
import { fetchStatsGrowth, fetchStatsGrowthDay } from '../../../services/stats';
import { formatPostDate } from '../../../lib/format';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import StatsLineChart from './StatsLineChart';
import StatsMetricTitle from './StatsMetricTitle';
import '../Statistics.css';

/**
 * @param {string} value
 */
function formatBirthDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

/**
 * @param {string} value YYYY-MM-DD
 */
function formatDayTitle(value) {
  if (!value || value.length < 10) return value || '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Метрика 1.1 — прирост пользователей за период.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onBack: () => void
 * }} props
 */
export default function StatsGrowthModal({ isOpen, onClose, onBack }) {
  const currentUser = getCurrentUser();
  const [range, setRange] = useState(getStatsDefaultDateRange);
  const [data, setData] = useState(
    /** @type {{ points: Array<{ date: string, count: number, cumulative: number }>, total: number } | null} */ (
      null
    )
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const [selectedDate, setSelectedDate] = useState(/** @type {string | null} */ (null));
  const [dayUsers, setDayUsers] = useState(/** @type {any[]} */ ([]));
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState(/** @type {string | null} */ (null));
  const [viewingPlayer, setViewingPlayer] = useState(/** @type {any | null} */ (null));

  const load = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStatsGrowth(period);
      setData(result);
    } catch (err) {
      console.error('[stats] growth', err);
      setData(null);
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
    if (!isOpen) {
      setSelectedDate(null);
      setDayUsers([]);
      setDayError(null);
      setViewingPlayer(null);
    }
  }, [isOpen]);

  const handleRangeChange = useCallback((next) => {
    setRange(next);
    setSelectedDate(null);
    setDayUsers([]);
    setDayError(null);
  }, []);

  const handleBarClick = useCallback(async (date) => {
    setSelectedDate(date);
    setDayLoading(true);
    setDayError(null);
    try {
      const result = await fetchStatsGrowthDay(date);
      setDayUsers(Array.isArray(result?.users) ? result.users : []);
    } catch (err) {
      console.error('[stats] growth/day', err);
      setDayUsers([]);
      setDayError(err?.message || 'Не удалось загрузить пользователей');
    } finally {
      setDayLoading(false);
    }
  }, []);

  const total = data?.total ?? 0;
  const points = data?.points ?? [];
  const isEmpty = !loading && !error && data != null && total === 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={<StatsMetricTitle onBack={onBack}>Прирост людей</StatsMetricTitle>}
        className="stats-metric-modal"
        size="large"
      >
        <StatsPeriodToolbar range={range} onChange={handleRangeChange} />

        {loading && !data ? (
          <Spinner label="Загрузка…" />
        ) : error ? (
          <EmptyState title="Ошибка загрузки" description={error} />
        ) : isEmpty ? (
          <EmptyState
            title="Нет новых пользователей"
            description="За выбранный период никто не зарегистрировался."
          />
        ) : (
          <>
            <div className="stats-growth__summary">
              Всего новых: <strong>{total}</strong>
              {loading ? <span className="stats-growth__loading">…</span> : null}
            </div>
            <StatsLineChart points={points} onBarClick={handleBarClick} />

            {selectedDate ? (
              <div className="stats-day-detail">
                <div className="stats-day-detail__header">
                  Новые за {formatDayTitle(selectedDate)}
                  {dayLoading ? <span className="stats-growth__loading">…</span> : null}
                </div>
                {dayError ? (
                  <EmptyState title="Ошибка" description={dayError} />
                ) : !dayLoading && dayUsers.length === 0 ? (
                  <EmptyState title="Пусто" description="В этот день никто не появился." />
                ) : (
                  <ul className="stats-user-preview-list">
                    {dayUsers.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className="stats-user-preview"
                          onClick={() => setViewingPlayer(user)}
                        >
                          <Avatar user={user} size="md" />
                          <span className="stats-user-preview__meta">
                            <span className="stats-user-preview__name">
                              {user.full_name || 'Без имени'}
                            </span>
                            <span className="stats-user-preview__line">
                              В приложении: {formatPostDate(user.created) || '—'}
                            </span>
                            <span className="stats-user-preview__line">
                              Дата рождения: {formatBirthDate(user.birth_date)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </>
        )}
      </Modal>

      <ProfileViewModal
        isOpen={Boolean(viewingPlayer)}
        onClose={() => setViewingPlayer(null)}
        targetUser={viewingPlayer}
        currentUser={currentUser}
      />
    </>
  );
}
