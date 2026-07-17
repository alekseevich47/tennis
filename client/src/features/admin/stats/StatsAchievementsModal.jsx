import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import {
  fetchStatsAchievements,
  fetchStatsAchievementGrants
} from '../../../services/stats';
import StatsPeriodToolbar, { getStatsDefaultDateRange } from './StatsPeriodToolbar';
import '../Statistics.css';

/** @typedef {'now' | 'period'} AchievementsMode */

/** @typedef {{
 *   id: string,
 *   fullName: string,
 *   grantedAt?: string
 * }} StatsAchievementUser */

/** @typedef {{
 *   level: number,
 *   title: string,
 *   requiredValue?: number,
 *   count: number,
 *   users: StatsAchievementUser[]
 * }} StatsAchievementLevel */

/** @typedef {{
 *   id: string,
 *   name: string,
 *   sortOrder?: number,
 *   levels: StatsAchievementLevel[]
 * }} StatsAchievementItem */

/** @type {{ id: AchievementsMode, label: string }[]} */
const MODES = [
  { id: 'now', label: 'Сейчас' },
  { id: 'period', label: 'За период' }
];

/**
 * Метрика 1.5 — достижения: текущие уровни и гранты за период.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void
 * }} props
 */
export default function StatsAchievementsModal({ isOpen, onClose }) {
  const [mode, setMode] = useState(/** @type {AchievementsMode} */ ('now'));
  const [range, setRange] = useState(getStatsDefaultDateRange);
  const [achievements, setAchievements] = useState(/** @type {StatsAchievementItem[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [expandedKey, setExpandedKey] = useState(/** @type {string | null} */ (null));

  const loadNow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStatsAchievements();
      setAchievements(Array.isArray(result?.achievements) ? result.achievements : []);
    } catch (err) {
      console.error('[stats] achievements', err);
      setAchievements([]);
      setError(err?.message || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPeriod = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStatsAchievementGrants(period);
      setAchievements(Array.isArray(result?.achievements) ? result.achievements : []);
    } catch (err) {
      console.error('[stats] achievements/grants', err);
      setAchievements([]);
      setError(err?.message || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'now') {
      void loadNow();
      return;
    }
    void loadPeriod(range);
  }, [isOpen, mode, range, loadNow, loadPeriod]);

  useEffect(() => {
    if (isOpen) return;
    setMode('now');
    setExpandedKey(null);
    setError(null);
  }, [isOpen]);

  const handleRangeChange = useCallback((next) => {
    setRange(next);
  }, []);

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode);
    setExpandedKey(null);
  }, []);

  const isEmpty = !loading && !error && achievements.length === 0;
  const emptyTitle = mode === 'now' ? 'Нет достижений' : 'Нет выдач';
  const emptyDescription =
    mode === 'now'
      ? 'В каталоге пока нет достижений или уровней.'
      : 'За выбранный период никто не получил новый уровень.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Достижения"
      className="stats-metric-modal"
      size="large"
    >
      <div className="stats-achievements__modes" role="group" aria-label="Режим">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={clsx(
              'stats-booking__slice',
              mode === item.id && 'stats-booking__slice--active'
            )}
            onClick={() => handleModeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'period' ? (
        <StatsPeriodToolbar range={range} onChange={handleRangeChange} />
      ) : null}

      {loading && achievements.length === 0 ? (
        <Spinner label="Загрузка…" />
      ) : error ? (
        <EmptyState title="Ошибка загрузки" description={error} />
      ) : isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="stats-achievements__list">
          {achievements.map((achievement) => (
            <section key={achievement.id} className="stats-achievements__block">
              <h3 className="stats-achievements__name">{achievement.name || 'Без названия'}</h3>
              <div className="stats-achievements__levels">
                {(achievement.levels || []).map((level) => {
                  const key = `${achievement.id}:${level.level}`;
                  const expanded = expandedKey === key;
                  const canExpand = level.count > 0;
                  return (
                    <div key={key} className="stats-achievements__level">
                      <button
                        type="button"
                        className={clsx(
                          'stats-achievements__level-row',
                          expanded && 'stats-achievements__level-row--expanded'
                        )}
                        disabled={!canExpand}
                        aria-expanded={expanded}
                        onClick={() => {
                          if (!canExpand) return;
                          setExpandedKey((current) => (current === key ? null : key));
                        }}
                      >
                        <span className="stats-achievements__level-meta">
                          <span className="stats-achievements__level-title">
                            Ур. {level.level}
                            {level.title ? ` — ${level.title}` : ''}
                          </span>
                          <span className="stats-achievements__level-hint">и выше</span>
                        </span>
                        <span className="stats-achievements__level-count">{level.count}</span>
                      </button>
                      {expanded ? (
                        <ul className="stats-achievements__users">
                          {(level.users || []).map((user) => (
                            <li key={user.id} className="stats-achievements__user">
                              {user.fullName || 'Без имени'}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {loading ? <p className="stats-booking__refresh">Обновление…</p> : null}
        </div>
      )}
    </Modal>
  );
}
