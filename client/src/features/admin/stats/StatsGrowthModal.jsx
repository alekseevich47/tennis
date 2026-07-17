import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import { fetchStatsGrowth } from '../../../services/stats';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import StatsLineChart from './StatsLineChart';
import '../Statistics.css';

/**
 * Метрика 1.1 — прирост пользователей за период.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void
 * }} props
 */
export default function StatsGrowthModal({ isOpen, onClose }) {
  const [range, setRange] = useState(getStatsDefaultDateRange);
  const [data, setData] = useState(
    /** @type {{ points: Array<{ date: string, count: number, cumulative: number }>, total: number } | null} */ (
      null
    )
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

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

  const handleRangeChange = useCallback((next) => {
    setRange(next);
  }, []);

  const total = data?.total ?? 0;
  const points = data?.points ?? [];
  const isEmpty = !loading && !error && data != null && total === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Прирост людей"
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
          <StatsLineChart points={points} />
        </>
      )}
    </Modal>
  );
}
