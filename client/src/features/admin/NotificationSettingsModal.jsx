import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Toggle from '../../components/ui/Toggle';
import InfoTooltip from '../../components/ui/InfoTooltip';
import { getNotificationSettings, updateNotificationSettings } from '../../services/admin';
import { error } from '../../lib/log';
import './NotificationSettingsModal.css';

const SETTINGS_ROWS = [
  {
    field: 'training_reminder_enabled',
    label: 'Напоминание о тренировках',
    tooltip:
      'Вечерняя рассылка в MAX накануне дня тренировки (20:00 GMT+7). Если выключено — бот не напомнит о записанных тренировках.'
  },
  {
    field: 'training_created_enabled',
    label: 'Создание тренировки',
    tooltip:
      'Сообщение в MAX при создании новой тренировки или турнира. Не влияет на саму запись в расписание.'
  },
  {
    field: 'training_edited_enabled',
    label: 'Изменение тренировки',
    tooltip:
      'Сообщение в MAX при изменении времени, места или других параметров тренировки.'
  },
  {
    field: 'training_deleted_enabled',
    label: 'Отмена тренировки',
    tooltip:
      'Сообщение в MAX при отмене тренировки. Возврат посещений и абонементов работает независимо от этого тумблера.'
  }
];

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function NotificationSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [savingField, setSavingField] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const record = await getNotificationSettings();
      setSettings(record);
      if (!record) setLoadError('Настройки не найдены');
    } catch (err) {
      error('load notification settings:', err);
      setLoadError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadSettings();
  }, [isOpen, loadSettings]);

  const handleToggle = async (field, value) => {
    if (!settings?.id || savingField) return;

    setSavingField(field);
    const previous = settings[field];

    setSettings((current) => (current ? { ...current, [field]: value } : current));

    try {
      const updated = await updateNotificationSettings(settings.id, { [field]: value });
      setSettings(updated);
    } catch (err) {
      error('update notification settings:', err);
      setSettings((current) => (current ? { ...current, [field]: previous } : current));
    } finally {
      setSavingField(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Включить уведомления">
      {loading && <p className="notification-settings-modal__loading">Загрузка...</p>}
      {loadError && <p className="notification-settings-modal__error">{loadError}</p>}
      {!loading && settings && (
        <div>
          {SETTINGS_ROWS.map((row) => (
            <div key={row.field} className="notification-settings-modal__row">
              <div className="notification-settings-modal__label">
                <InfoTooltip text={row.tooltip}>{row.label}</InfoTooltip>
              </div>
              <Toggle
                checked={settings[row.field] === true}
                disabled={savingField === row.field}
                ariaLabel={row.label}
                onChange={(value) => handleToggle(row.field, value)}
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
