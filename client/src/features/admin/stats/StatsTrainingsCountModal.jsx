import React, { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import { fetchStatsTrainingsCount } from '../../../services/stats';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import '../Statistics.css';

/**
 * @param {string} value YYYY-MM-DD
 */
function formatAxisDate(value) {
  if (!value || value.length < 10) return value || '';
  const [, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}`;
}

/**
 * @param {string} value YYYY-MM-DD
 */
function formatTooltipDate(value) {
  if (!value || value.length < 10) return value || '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Метрика 1.4 — проведённые тренировки (group / tournament).
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void
 * }} props
 */
export default function StatsTrainingsCountModal({ isOpen, onClose }) {
  const [range, setRange] = useState(getStatsDefaultDateRange);
  const [data, setData] = useState(
    /** @type {{
     *   total: number,
     *   group: number,
     *   tournament: number,
     *   byDay: Array<{ date: string, group: number, tournament: number, total: number }>
     * } | null} */ (null)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const load = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStatsTrainingsCount(period);
      setData(result);
    } catch (err) {
      console.error('[stats] trainings-count', err);
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
  const group = data?.group ?? 0;
  const tournament = data?.tournament ?? 0;
  const byDay = data?.byDay ?? [];
  const isEmpty = !loading && !error && data != null && total === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Проведённые тренировки"
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
          title="Нет проведённых тренировок"
          description="За выбранный период завершённых тренировок не было."
        />
      ) : (
        <>
          <div className="stats-trainings__summary">
            <div className="stats-trainings__stat">
              <span className="stats-trainings__stat-label">Всего</span>
              <strong className="stats-trainings__stat-value">{total}</strong>
            </div>
            <div className="stats-trainings__stat">
              <span className="stats-trainings__stat-label">Групповые</span>
              <strong className="stats-trainings__stat-value">{group}</strong>
            </div>
            <div className="stats-trainings__stat">
              <span className="stats-trainings__stat-label">Турниры</span>
              <strong className="stats-trainings__stat-value">{tournament}</strong>
            </div>
            {loading ? <span className="stats-growth__loading">…</span> : null}
          </div>

          {byDay.length > 0 ? (
            <div className="stats-line-chart" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0, 0, 0, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatAxisDate}
                    tick={{ fontSize: 11, fill: '#868e96' }}
                    axisLine={{ stroke: 'rgba(0, 0, 0, 0.12)' }}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#868e96' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    labelFormatter={formatTooltipDate}
                    formatter={(value, name) => [value, name]}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      fontSize: 13
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar
                    dataKey="group"
                    name="Групповые"
                    stackId="trainings"
                    fill="#007aff"
                    fillOpacity={0.75}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="tournament"
                    name="Турниры"
                    stackId="trainings"
                    fill="#1f2937"
                    fillOpacity={0.7}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </>
      )}
    </Modal>
  );
}
