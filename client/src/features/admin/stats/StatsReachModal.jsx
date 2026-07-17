import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import InfoTooltip from '../../../components/ui/InfoTooltip';
import PostDetailModal from '../../feed/PostDetailModal';
import TournamentPostDetailModal from '../../competitions/TournamentPostDetailModal';
import { getCurrentUser, isModerator } from '../../../services/auth';
import pb from '../../../services/pb';
import { fetchStatsReach } from '../../../services/stats';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import StatsMetricTitle from './StatsMetricTitle';
import '../Statistics.css';

const REACH_HINT =
  'Учитываются просмотры в ленте более 1 с (в зоне видимости) и открытие карточки.';

/** @typedef {{
 *   viewsTotal: number,
 *   activeCount: number,
 *   passiveCount: number,
 *   totalUsers: number,
 *   byType: {
 *     post: { viewsTotal: number, activeCount: number },
 *     tournament_post: { viewsTotal: number, activeCount: number }
 *   },
 *   topPosts: Array<{
 *     object_type: string,
 *     object_id: string,
 *     views: number,
 *     post_number?: number | null
 *   }>
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
 * Подтянуть post_number из posts / tournament_posts, если API не вернул.
 * @param {StatsReachData['topPosts']} topPosts
 */
async function enrichTopPostNumbers(topPosts) {
  const list = Array.isArray(topPosts) ? topPosts : [];
  await Promise.all(
    list.map(async (item) => {
      const existing = Number(item.post_number);
      if (Number.isFinite(existing) && existing > 0) {
        item.post_number = existing;
        return;
      }
      const collection =
        item.object_type === 'tournament_post' ? 'tournament_posts' : 'posts';
      try {
        const rec = await pb.collection(collection).getOne(item.object_id, {
          fields: 'id,post_number'
        });
        const n = Number(rec?.post_number);
        item.post_number = Number.isFinite(n) && n > 0 ? n : null;
      } catch {
        item.post_number = null;
      }
    })
  );
  return list;
}

function InfoCircleIcon() {
  return (
    <svg
      className="stats-reach__info-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" strokeLinecap="round" />
      <path d="M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Метрика 1.2 — охват постов (просмотры ленты и турнира).
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onBack: () => void
 * }} props
 */
export default function StatsReachModal({ isOpen, onClose, onBack }) {
  const [range, setRange] = useState(getStatsDefaultDateRange);
  const [data, setData] = useState(/** @type {StatsReachData | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [preview, setPreview] = useState(
    /** @type {{ objectType: 'post' | 'tournament_post', post: any } | null} */ (null)
  );
  const [openingId, setOpeningId] = useState(/** @type {string | null} */ (null));

  const user = getCurrentUser();
  const userIsModerator = isModerator();

  const load = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStatsReach(period);
      if (result?.topPosts?.length) {
        await enrichTopPostNumbers(result.topPosts);
      }
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
    if (!isOpen) {
      setPreview(null);
      return;
    }
    void load(range);
  }, [isOpen, range, load]);

  const handleRangeChange = useCallback((next) => {
    setRange(next);
  }, []);

  const handleOpenPost = useCallback(async (item) => {
    const objectType =
      item.object_type === 'tournament_post' ? 'tournament_post' : 'post';
    const collection = objectType === 'tournament_post' ? 'tournament_posts' : 'posts';
    setOpeningId(item.object_id);
    try {
      const post = await pb.collection(collection).getOne(item.object_id, {
        expand: 'author'
      });
      setPreview({ objectType, post });
    } catch (err) {
      console.error('[stats] open post', err);
    } finally {
      setOpeningId(null);
    }
  }, []);

  const viewsTotal = data?.viewsTotal ?? 0;
  const isEmpty = !loading && !error && data != null && viewsTotal === 0;
  const topPosts = data?.topPosts ?? [];
  const byPost = data?.byType?.post;
  const byTournament = data?.byType?.tournament_post;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={<StatsMetricTitle onBack={onBack}>Охват постов</StatsMetricTitle>}
        className="stats-metric-modal"
        size="large"
      >
        <StatsPeriodToolbar
          range={range}
          onChange={handleRangeChange}
          leading={(
            <InfoTooltip text={REACH_HINT} className="stats-reach__info-tooltip">
              <InfoCircleIcon />
              <span className="stats-reach__sr-only">Подсказка</span>
            </InfoTooltip>
          )}
        />

        {loading && !data ? (
          <Spinner label="Загрузка…" />
        ) : error && !data ? (
          <EmptyState title="Ошибка загрузки" description={error} />
        ) : isEmpty ? (
          <EmptyState
            title="Нет просмотров"
            description="За выбранный период просмотров не зафиксировано. История до внедрения трекера недоступна."
          />
        ) : (
          <>
            {loading ? <p className="stats-growth__loading">Обновление…</p> : null}

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
                  {topPosts.map((item) => {
                    const num = Number(item.post_number);
                    const hasNum = Number.isFinite(num) && num > 0;
                    const label = typeLabel(item.object_type);
                    return (
                      <li
                        key={`${item.object_type}:${item.object_id}`}
                        className="stats-reach__top-item"
                      >
                        <span className="stats-reach__top-line">
                          <span className="stats-reach__top-type">
                            {hasNum ? `${label} #${num}` : label}
                          </span>
                          <span className="stats-reach__top-id-wrap">
                            (id{' '}
                            <button
                              type="button"
                              className="stats-reach__top-id-btn"
                              disabled={openingId === item.object_id}
                              onClick={() => void handleOpenPost(item)}
                            >
                              {item.object_id}
                            </button>
                            )
                          </span>
                        </span>
                        <span className="stats-reach__top-views">{item.views}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </>
        )}
      </Modal>

      <PostDetailModal
        isOpen={Boolean(preview?.objectType === 'post' && preview.post)}
        post={preview?.objectType === 'post' ? preview.post : null}
        user={user}
        userIsModerator={userIsModerator}
        onOpenEdit={() => {}}
        onDeletePost={() => {}}
        onClose={() => setPreview(null)}
        onAfterClose={() => {}}
        trackView={false}
      />

      <TournamentPostDetailModal
        isOpen={Boolean(preview?.objectType === 'tournament_post' && preview.post)}
        post={preview?.objectType === 'tournament_post' ? preview.post : null}
        user={user}
        userIsModerator={userIsModerator}
        onClose={() => setPreview(null)}
        trackView={false}
      />
    </>
  );
}
