import React, { useState } from 'react';
import BroadcastModal from './BroadcastModal';
import NotificationSendModal from './NotificationSendModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import './AdminPanelPage.css';

/**
 * Корневая страница раздела «Админ-панель».
 */
export default function AdminPanelPage() {
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="admin-panel">
      <ul className="admin-panel__list">
        <li>
          <button type="button" className="admin-panel__item admin-panel__item--stub">
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
            onClick={() => setNotificationOpen(true)}
          >
            Отправить уведомление
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
          <button type="button" className="admin-panel__item admin-panel__item--stub">
            Логи
          </button>
        </li>
      </ul>

      <BroadcastModal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
      <NotificationSendModal
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
      <NotificationSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
