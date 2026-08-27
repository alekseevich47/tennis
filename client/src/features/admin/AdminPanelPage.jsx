import React, { useCallback, useState } from 'react';
import BroadcastModal from './BroadcastModal';
import LogsModal from './LogsModal';
import NotificationSendModal from './NotificationSendModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import SystemTemplatesModal from './SystemTemplatesModal';
import StatisticsHubModal from './StatisticsHubModal';
import StatsGrowthModal from './stats/StatsGrowthModal';
import StatsReachModal from './stats/StatsReachModal';
import StatsBookingModal from './stats/StatsBookingModal';
import StatsTrainingsCountModal from './stats/StatsTrainingsCountModal';
import StatsAchievementsModal from './stats/StatsAchievementsModal';
import './AdminPanelPage.css';

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
      <StatsGrowthModal
        isOpen={statsMetric === 'growth'}
        onClose={() => setStatsMetric(null)}
        onBack={handleStatsBack}
      />
      <StatsReachModal
        isOpen={statsMetric === 'reach'}
        onClose={() => setStatsMetric(null)}
        onBack={handleStatsBack}
      />
      <StatsBookingModal
        isOpen={statsMetric === 'booking'}
        onClose={() => setStatsMetric(null)}
        onBack={handleStatsBack}
      />
      <StatsTrainingsCountModal
        isOpen={statsMetric === 'trainings'}
        onClose={() => setStatsMetric(null)}
        onBack={handleStatsBack}
      />
      <StatsAchievementsModal
        isOpen={statsMetric === 'achievements'}
        onClose={() => setStatsMetric(null)}
        onBack={handleStatsBack}
      />
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
