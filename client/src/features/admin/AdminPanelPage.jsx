import React, { Suspense, lazy, useCallback, useState } from 'react';
import BroadcastModal from './BroadcastModal';
import LogsModal from './LogsModal';
import NotificationSendModal from './NotificationSendModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import SystemTemplatesModal from './SystemTemplatesModal';
import StatisticsHubModal from './StatisticsHubModal';
import Spinner from '../../components/ui/Spinner';
import './AdminPanelPage.css';

const LazyStatsGrowthModal = lazy(() => import('./stats/StatsGrowthModal'));
const LazyStatsReachModal = lazy(() => import('./stats/StatsReachModal'));
const LazyStatsBookingModal = lazy(() => import('./stats/StatsBookingModal'));
const LazyStatsTrainingsCountModal = lazy(() => import('./stats/StatsTrainingsCountModal'));
const LazyStatsAchievementsModal = lazy(() => import('./stats/StatsAchievementsModal'));

function StatsModalSuspense({ children }) {
  return (
    <Suspense
      fallback={
        <div className="app-boot">
          <Spinner label="Загрузка..." />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Корневая страница раздела «Админ-панель».
 */
export default function AdminPanelPage() {
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [editBroadcastsOpen, setEditBroadcastsOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [editNotificationsOpen, setEditNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [statsHubOpen, setStatsHubOpen] = useState(false);
  /** Выбранная метрика; модалки — шаги 7–11 TASKS_121 */
  const [statsMetric, setStatsMetric] = useState(
    /** @type {'growth' | 'reach' | 'booking' | 'trainings' | 'achievements' | null} */ (null)
  );

  const handleSelectMetric = useCallback((id) => {
    setStatsHubOpen(false);
    setStatsMetric(id);
  }, []);

  const handleStatsBack = useCallback(() => {
    setStatsMetric(null);
    setStatsHubOpen(true);
  }, []);

  return (
    <div className="admin-panel">
      <ul className="admin-panel__list">
        <li>
          <button
            type="button"
            className="admin-panel__item"
            onClick={() => setStatsHubOpen(true)}
          >
            Статистика
          </button>
        </li>
        <li>
          <button
            type="button"
            className="admin-panel__item"
            onClick={() => setBroadcastOpen(true)}
          >
            Сделать рассылку
          </button>
        </li>
        <li>
          <button
            type="button"
            className="admin-panel__item"
            onClick={() => setEditBroadcastsOpen(true)}
          >
            Редактировать рассылки
          </button>
        </li>
        <li>
          <button
            type="button"
            className="admin-panel__item"
            onClick={() => setNotificationOpen(true)}
          >
            Отправить уведомление
          </button>
        </li>
        <li>
          <button
            type="button"
            className="admin-panel__item"
            onClick={() => setEditNotificationsOpen(true)}
          >
            Редактировать уведомления
          </button>
        </li>
        <li>
          <button
            type="button"
            className="admin-panel__item"
            onClick={() => setSettingsOpen(true)}
          >
            Включить уведомления
          </button>
        </li>
        <li>
          <button
            type="button"
            className="admin-panel__item"
            onClick={() => setLogsOpen(true)}
          >
            Логи
          </button>
        </li>
      </ul>

      <StatisticsHubModal
        isOpen={statsHubOpen}
        onClose={() => setStatsHubOpen(false)}
        onSelect={handleSelectMetric}
      />
      {statsMetric === 'growth' && (
        <StatsModalSuspense>
          <LazyStatsGrowthModal
            isOpen
            onClose={() => setStatsMetric(null)}
            onBack={handleStatsBack}
          />
        </StatsModalSuspense>
      )}
      {statsMetric === 'reach' && (
        <StatsModalSuspense>
          <LazyStatsReachModal
            isOpen
            onClose={() => setStatsMetric(null)}
            onBack={handleStatsBack}
          />
        </StatsModalSuspense>
      )}
      {statsMetric === 'booking' && (
        <StatsModalSuspense>
          <LazyStatsBookingModal
            isOpen
            onClose={() => setStatsMetric(null)}
            onBack={handleStatsBack}
          />
        </StatsModalSuspense>
      )}
      {statsMetric === 'trainings' && (
        <StatsModalSuspense>
          <LazyStatsTrainingsCountModal
            isOpen
            onClose={() => setStatsMetric(null)}
            onBack={handleStatsBack}
          />
        </StatsModalSuspense>
      )}
      {statsMetric === 'achievements' && (
        <StatsModalSuspense>
          <LazyStatsAchievementsModal
            isOpen
            onClose={() => setStatsMetric(null)}
            onBack={handleStatsBack}
          />
        </StatsModalSuspense>
      )}
      <BroadcastModal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
      <SystemTemplatesModal
        isOpen={editBroadcastsOpen}
        onClose={() => setEditBroadcastsOpen(false)}
        channel="bot"
        title="Редактировать рассылки"
      />
      <NotificationSendModal
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
      <SystemTemplatesModal
        isOpen={editNotificationsOpen}
        onClose={() => setEditNotificationsOpen(false)}
        channel="app"
        title="Редактировать уведомления"
      />
      <NotificationSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <LogsModal isOpen={logsOpen} onClose={() => setLogsOpen(false)} />
    </div>
  );
}
