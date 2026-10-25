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
      'Вечерняя рассылка в MAX/Telegram накануне дня тренировки (20:00 GMT+7). Если выключено — бот не напомнит о записанных тренировках.'
  },
  {
    field: 'training_created_enabled',
    label: 'Создание тренировки',
    tooltip:
      'Сообщение в бот при создании новой тренировки или турнира. Не влияет на саму запись в расписание.'
  },
  {
    field: 'training_edited_enabled',
    label: 'Изменение тренировки',
    tooltip:
      'Сообщение в бот при изменении времени, места или других параметров тренировки.',
    tooltipPlacement: 'top'
  },
  {
    field: 'training_deleted_enabled',
    label: 'Отмена тренировки',
    tooltip:
      'Сообщение в бот при отмене тренировки (API и серверная финализация). Возврат посещений работает независимо от этого тумблера.',
    tooltipPlacement: 'top'
  },
  {
    field: 'training_restored_enabled',
    label: 'Восстановление тренировки',
    tooltip:
      'Сообщение в бот при восстановлении отменённой тренировки. Не влияет на возврат записи и сессий.',
    tooltipPlacement: 'top'
  },
  {
    field: 'training_status_enabled',
    label: 'Открытие/закрытие записи',
    tooltip:
      'Рассылка всем при ручном закрытии или открытии записи (кнопка стоп/плей). Автозакрытие по времени начала сообщений не шлёт.',
    tooltipPlacement: 'top'
  },
  {
    field: 'training_booking_enabled',
    label: 'Запись участников',
    tooltip:
      'Рассылка от бота модераторам о новых записях на тренировку/турнир участниками (или модератором) и о снятии записи.',
    tooltipPlacement: 'top'
  },
  {
    field: 'comments_notification_enabled',
    label: 'Уведомления о комментариях',
    tooltip: 'Рассылка от бота модераторам о новых и отредактированных комментариях в лентах и галерее.',
    tooltipPlacement: 'top'
  },
  {
    field: 'posts_created_enabled',
    label: 'Создание постов (лента)',
    tooltip:
      'Сообщение в бот при публикации нового поста в ленте. Не влияет на саму публикацию.',
    tooltipPlacement: 'top'
  },
  {
    field: 'tournament_posts_created_enabled',
    label: 'Создание постов (турнир)',
    tooltip:
      'Сообщение в бот при публикации нового поста в турнирной ленте. Не влияет на саму публикацию.',
    tooltipPlacement: 'top'
  },
  {
    field: 'user_registered_enabled',
    label: 'Регистрация участника',
    tooltip:
      'Сообщение модераторам в бот при создании нового пользователя (MAX/Telegram auth или ручное добавление).',
    tooltipPlacement: 'top'
  },
  {
    field: 'welcome_enabled',
    label: 'Приветствие в боте',
    tooltip:
      'Текст приветствия при старте бота (MAX bot_started / Telegram /start). Снятие блокировки бота работает независимо.',
    tooltipPlacement: 'top'
  },
  {
    field: 'membership_freeze_enabled',
    label: 'Заморозка абонемента',
    tooltip:
      'Участнику и модераторам: заморозка, разморозка, предупреждения «через 7 дней» и «завтра». In-app уведомления не затрагивает.',
    tooltipPlacement: 'top'
  },
  {
    field: 'membership_stop_enabled',
    label: 'Остановка/запуск абонемента',
    tooltip:
      'Участнику и модераторам при остановке и повторном запуске абонемента.',
    tooltipPlacement: 'top'
  },
  {
    field: 'membership_expiry_enabled',
    label: 'Окончание абонемента',
    tooltip:
      'Предупреждение за 7 дней и сообщение в день окончания абонемента (участнику и модераторам).',
    tooltipPlacement: 'top'
  },
  {
    field: 'membership_topup_enabled',
    label: 'Начисление посещений',
    tooltip: 'Сообщение участнику в бот при пополнении доступных посещений.',
    tooltipPlacement: 'top'
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
                <InfoTooltip text={row.tooltip} placement={row.tooltipPlacement}>
                  {row.label}
                </InfoTooltip>
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
