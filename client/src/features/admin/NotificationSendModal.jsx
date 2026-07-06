import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import UserMultiSelect from './UserMultiSelect';
import {
  listScheduledNotifications,
  createScheduledNotification,
  updateScheduledNotification,
  cancelScheduledNotification,
  toDatetimeLocalValue
} from '../../services/admin';
import { formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';
import './NotificationSendModal.css';

function defaultDatetimeLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getAudienceLabel(audience) {
  if (audience === 'all') return 'Все';
  if (audience === 'all_except_banned') return 'Все, кроме заблокированных';
  return 'Выбранные';
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function NotificationSendModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [recipients, setRecipients] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(defaultDatetimeLocal);
  const [sendNow, setSendNow] = useState(false);
  const [pending, setPending] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setBody('');
    setAudience('all');
    setRecipients([]);
    setScheduledAt(defaultDatetimeLocal());
    setSendNow(false);
    setEditingId(null);
    setFormError('');
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const items = await listScheduledNotifications();
      setPending(items);
    } catch (err) {
      error('load scheduled notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    loadPending();
  }, [isOpen, resetForm, loadPending]);

  const handleAudienceChange = useCallback((value) => {
    setAudience(value.audience);
    setRecipients(value.recipients);
  }, []);

  const handleEdit = useCallback((item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setBody(item.body || '');
    setAudience(item.audience || 'all');
    setRecipients(Array.isArray(item.recipients) ? item.recipients : []);
    setScheduledAt(toDatetimeLocalValue(item.scheduled_at) || defaultDatetimeLocal());
    setSendNow(false);
    setFormError('');
  }, []);

  const handleCancel = useCallback(
    async (id) => {
      try {
        await cancelScheduledNotification(id);
        if (editingId === id) resetForm();
        await loadPending();
      } catch (err) {
        error('cancel notification:', err);
      }
    },
    [editingId, resetForm, loadPending]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      setFormError('Введите заголовок');
      return;
    }
    if (!trimmedBody) {
      setFormError('Введите текст уведомления');
      return;
    }
    if (!sendNow && !scheduledAt) {
      setFormError('Укажите дату и время отправки');
      return;
    }
    if (audience === 'selected' && recipients.length === 0) {
      setFormError('Выберите хотя бы одного получателя');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const payload = {
      title: trimmedTitle,
      body: trimmedBody,
      audience,
      recipients,
      sendNow,
      scheduledAt
    };

    try {
      if (editingId) {
        await updateScheduledNotification(editingId, payload);
      } else {
        await createScheduledNotification(payload);
      }
      resetForm();
      await loadPending();
    } catch (err) {
      error('save notification:', err);
      setFormError('Не удалось сохранить уведомление');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Отправить уведомление"
      size="large"
      footer={
        <button
          type="submit"
          form="notification-send-form"
          className="submit-btn-full"
          disabled={submitting}
        >
          {submitting ? 'Сохраняем...' : editingId ? 'Сохранить изменения' : 'Запланировать'}
        </button>
      }
    >
      <form id="notification-send-form" onSubmit={handleSubmit}>
        {formError && <p className="admin-modal__error">{formError}</p>}

        <div className="admin-modal__field">
          <label className="admin-modal__label" htmlFor="notification-title">
            Заголовок
          </label>
          <input
            id="notification-title"
            type="text"
            className="admin-modal__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Заголовок уведомления"
          />
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label" htmlFor="notification-body">
            Текст
          </label>
          <textarea
            id="notification-body"
            className="admin-modal__textarea"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Текст уведомления в приложении..."
          />
        </div>

        <div className="admin-modal__field">
          <span className="admin-modal__label">Получатели</span>
          <UserMultiSelect
            audience={audience}
            recipients={recipients}
            onChange={handleAudienceChange}
          />
        </div>

        <div className="admin-modal__field">
          <span className="admin-modal__label">Дата и время отправки</span>
          <div className="admin-modal__schedule">
            <input
              type="datetime-local"
              className="admin-modal__datetime"
              value={scheduledAt}
              disabled={sendNow}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
            <label className="admin-modal__now">
              <input
                type="checkbox"
                checked={sendNow}
                onChange={(event) => setSendNow(event.target.checked)}
              />
              Сейчас
            </label>
          </div>
        </div>
      </form>

      <div className="admin-modal__pending">
        <h3 className="admin-modal__pending-title">Запланированные уведомления</h3>
        {pending.length === 0 ? (
          <p className="admin-modal__empty">Нет запланированных уведомлений</p>
        ) : (
          <ul className="admin-modal__pending-list">
            {pending.map((item) => (
              <li key={item.id} className="admin-modal__pending-item">
                <div className="admin-modal__pending-text">
                  <strong>{item.title}</strong>
                  <br />
                  {item.body}
                  <span className="admin-modal__pending-meta">
                    {formatPostDate(item.scheduled_at)} · {getAudienceLabel(item.audience)}
                  </span>
                </div>
                <div className="admin-modal__pending-actions">
                  <button
                    type="button"
                    className="admin-modal__action-btn"
                    onClick={() => handleEdit(item)}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="admin-modal__action-btn admin-modal__action-btn--danger"
                    onClick={() => handleCancel(item.id)}
                  >
                    Отменить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
