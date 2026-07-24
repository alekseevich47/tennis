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
import TrainingDetailModal from '../../trainings/TrainingDetailModal';
import { getCurrentUser, isModerator } from '../../../services/auth';
import pb from '../../../services/pb';
import { fetchStatsTrainingsCount, fetchStatsTrainingsDay } from '../../../services/stats';
import { formatCardDateWithYear, formatTimeRange } from '../../../lib/format';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import StatsMetricTitle from './StatsMetricTitle';
import '../../trainings/Trainings.css';
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
 * @param {string} value YYYY-MM-DD
 */
function formatDayTitle(value) {
  if (!value || value.length < 10) return value || '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

const TRAINING_EXPAND =
  'booked_users,attended_users,unbooked_users,moderator_kicked_users,restore_insufficient_users';

/**
 * Метрика 1.4 — проведённые тренировки (group / tournament).
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onBack: () => void
 * }} props
 */
export default function StatsTrainingsCountModal({ isOpen, onClose, onBack }) {
  const currentUser = getCurrentUser();
  const userIsModerator = isModerator(currentUser);
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

  const [selectedDate, setSelectedDate] = useState(/** @type {string | null} */ (null));
  const [dayTrainings, setDayTrainings] = useState(/** @type {any[]} */ ([]));
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState(/** @type {string | null} */ (null));
  const [selectedTraining, setSelectedTraining] = useState(/** @type {any | null} */ (null));

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

  useEffect(() => {
    if (!isOpen) {
      setSelectedDate(null);
      setDayTrainings([]);
      setDayError(null);
      setSelectedTraining(null);
    }
  }, [isOpen]);

  const handleRangeChange = useCallback((next) => {
    setRange(next);
    setSelectedDate(null);
    setDayTrainings([]);
    setDayError(null);
  }, []);

  const loadDay = useCallback(async (date) => {
    setSelectedDate(date);
    setDayLoading(true);
    setDayError(null);
    try {
      const result = await fetchStatsTrainingsDay(date);
      setDayTrainings(Array.isArray(result?.trainings) ? result.trainings : []);
    } catch (err) {
      console.error('[stats] trainings-count/day', err);
      setDayTrainings([]);
      setDayError(err?.message || 'Не удалось загрузить тренировки');
    } finally {
      setDayLoading(false);
    }
  }, []);

  const handleBarClick = useCallback(
    (item) => {
      const payload = item?.payload;
      const date = payload?.date;
      const total = Number(payload?.total) || 0;
      if (!date || total <= 0) return;
      void loadDay(date);
    },
    [loadDay]
  );

  const handleOpenDetail = useCallback(async (training) => {
    try {
      const full = await pb.collection('trainings').getOne(training.id, {
        expand: TRAINING_EXPAND
      });
      setSelectedTraining(full);
    } catch (err) {
      console.error('[stats] training detail', err);
      setSelectedTraining(training);
    }
  }, []);

  const handleDetailMutated = useCallback(async () => {
    if (!selectedTraining?.id) return;
    try {
      const full = await pb.collection('trainings').getOne(selectedTraining.id, {
        expand: TRAINING_EXPAND
      });
      setSelectedTraining(full);
    } catch {
      /* ignore */
    }
    if (selectedDate) void loadDay(selectedDate);
  }, [selectedTraining?.id, selectedDate, loadDay]);

  const total = data?.total ?? 0;
  const group = data?.group ?? 0;
  const tournament = data?.tournament ?? 0;
  const byDay = data?.byDay ?? [];
  const isEmpty = !loading && !error && data != null && total === 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={<StatsMetricTitle onBack={onBack}>Проведённые тренировки</StatsMetricTitle>}
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
                      activeBar={false}
                      cursor="pointer"
                      onClick={handleBarClick}
                    />
                    <Bar
                      dataKey="tournament"
                      name="Турниры"
                      stackId="trainings"
                      fill="#1f2937"
                      fillOpacity={0.7}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                      activeBar={false}
                      cursor="pointer"
                      onClick={handleBarClick}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {selectedDate ? (
              <div className="stats-day-detail">
                <div className="stats-day-detail__header">
                  Тренировки за {formatDayTitle(selectedDate)}
                  {dayLoading ? <span className="stats-growth__loading">…</span> : null}
                </div>
                {dayError ? (
                  <EmptyState title="Ошибка" description={dayError} />
                ) : !dayLoading && dayTrainings.length === 0 ? (
                  <EmptyState title="Пусто" description="В этот день проведённых тренировок нет." />
                ) : (
                  <div className="archive-list stats-day-detail__list">
                    {dayTrainings.map((training) => {
                      const isCancelled = training.is_cancelled === true;
                      return (
                        <div
                          key={training.id}
                          className="training-row-card archive-card"
                          onClick={() => void handleOpenDetail(training)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void handleOpenDetail(training);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Тренировка ${formatCardDateWithYear(training.date)}, ${formatTimeRange(training.date, training.duration)}`}
                        >
                          <div className="card-main-info-col">
                            <span className="card-row-date">
                              {formatCardDateWithYear(training.date)}
                            </span>
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
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </Modal>

      <TrainingDetailModal
        isOpen={Boolean(selectedTraining)}
        training={selectedTraining}
        userIsModerator={userIsModerator}
        currentUser={currentUser}
        onClose={() => setSelectedTraining(null)}
        onMutated={handleDetailMutated}
      />
    </>
  );
}
