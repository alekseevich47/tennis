import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import { fetchStatsReach } from '../../../services/stats';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import '../Statistics.css';

/** @typedef {{
 *   viewsTotal: number,
 *   activeCount: number,
 *   passiveCount: number,
 *   totalUsers: number,
 *   byType: {
 *     post: { viewsTotal: number, activeCount: number },
 *     tournament_post: { viewsTotal: number, activeCount: number }
 *   },
 *   topPosts: Array<{ object_type: string, object_id: string, views: number }>
 * }} StatsReachData */

/**
 * @param {string} objectType
 */
function typeLabel(objectType) {
  if (objectType === 'post') return 'Лента';
  if (objectType === 'tournament_post') return 'Турнир';
  return objectType || '—';
}

/**
 * Метрика 1.2 — охват постов (просмотры ленты и турнира).
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void
 * }} props
 */
export default function StatsReachModal({ isOpen, onClose }) {
  const [range, setRange] = useState(getStatsDefaultDateRange);
  const [data, setData] = useState(/** @type {StatsReachData | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const load = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStatsReach(period);
      setData(result);
    } catch (err) {
      console.error('[stats] reach', err);
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

  const viewsTotal = data?.viewsTotal ?? 0;
  const isEmpty = !loading && !error && data != null && viewsTotal === 0;
  const topPosts = data?.topPosts ?? [];
  const byPost = data?.byType?.post;
  const byTournament = data?.byType?.tournament_post;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Охват постов"
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
          title="Нет просмотров"
          description="За выбранный период просмотров не зафиксировано. История до внедрения трекера недоступна."
        />
      ) : (
        <>
          <p className="stats-reach__hint">
            Учитываются просмотры с момента внедрения трекера (viewport ≥1,2 с и открытие
            карточки).
            {loading ? <span className="stats-growth__loading">…</span> : null}
          </p>

          <div className="stats-reach__summary">
            <div className="stats-trainings__stat">
              <span className="stats-trainings__stat-label">Просмотров</span>
              <span className="stats-trainings__stat-value">{viewsTotal}</span>
            </div>
            <div className="stats-trainings__stat">
              <span className="stats-trainings__stat-label">Активные</span>
              <span className="stats-trainings__stat-value">{data?.activeCount ?? 0}</span>
            </div>
            <div className="stats-trainings__stat">
              <span className="stats-trainings__stat-label">Пассивные</span>
              <span className="stats-trainings__stat-value">{data?.passiveCount ?? 0}</span>
            </div>
            <div className="stats-trainings__stat">
              <span className="stats-trainings__stat-label">Всего users</span>
              <span className="stats-trainings__stat-value">{data?.totalUsers ?? 0}</span>
            </div>
          </div>

          <div className="stats-reach__by-type">
            <div className="stats-reach__type-card">
              <div className="stats-reach__type-title">Лента</div>
              <div className="stats-reach__type-row">
                <span>Просмотры</span>
                <strong>{byPost?.viewsTotal ?? 0}</strong>
              </div>
              <div className="stats-reach__type-row">
                <span>Активные</span>
                <strong>{byPost?.activeCount ?? 0}</strong>
              </div>
            </div>
            <div className="stats-reach__type-card">
              <div className="stats-reach__type-title">Турнир</div>
              <div className="stats-reach__type-row">
                <span>Просмотры</span>
                <strong>{byTournament?.viewsTotal ?? 0}</strong>
              </div>
              <div className="stats-reach__type-row">
                <span>Активные</span>
                <strong>{byTournament?.activeCount ?? 0}</strong>
              </div>
            </div>
          </div>

          {topPosts.length > 0 ? (
            <div className="stats-reach__top">
              <div className="stats-reach__top-title">Топ по просмотрам</div>
              <ol className="stats-reach__top-list">
                {topPosts.map((item) => (
                  <li key={`${item.object_type}:${item.object_id}`} className="stats-reach__top-item">
                    <span className="stats-reach__top-meta">
                      <span className="stats-reach__top-type">{typeLabel(item.object_type)}</span>
                      <span className="stats-reach__top-id" title={item.object_id}>
                        {item.object_id}
                      </span>
                    </span>
                    <span className="stats-reach__top-views">{item.views}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}
    </Modal>
  );
}
