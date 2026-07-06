import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import UserMultiSelect from './UserMultiSelect';
import {
  listScheduledBroadcasts,
  createScheduledBroadcast,
  updateScheduledBroadcast,
  cancelScheduledBroadcast,
  toDatetimeLocalValue
} from '../../services/admin';
import { formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';
import './BroadcastModal.css';

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
export default function BroadcastModal({ isOpen, onClose }) {
  const [text, setText] = useState('');
  const [audience, setAudience] = useState('all');
  const [recipients, setRecipients] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(defaultDatetimeLocal);
  const [sendNow, setSendNow] = useState(false);
  const [pending, setPending] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const resetForm = useCallback(() => {
    setText('');
    setAudience('all');
    setRecipients([]);
    setScheduledAt(defaultDatetimeLocal());
    setSendNow(false);
    setEditingId(null);
    setFormError('');
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const items = await listScheduledBroadcasts();
      setPending(items);
    } catch (err) {
      error('load scheduled broadcasts:', err);
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
    setText(item.text || '');
    setAudience(item.audience || 'all');
    setRecipients(Array.isArray(item.recipients) ? item.recipients : []);
    setScheduledAt(toDatetimeLocalValue(item.scheduled_at) || defaultDatetimeLocal());
    setSendNow(false);
    setFormError('');
  }, []);

  const handleCancel = useCallback(
    async (id) => {
      try {
        await cancelScheduledBroadcast(id);
        if (editingId === id) resetForm();
        await loadPending();
      } catch (err) {
        error('cancel broadcast:', err);
      }
    },
    [editingId, resetForm, loadPending]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setFormError('Введите текст рассылки');
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
      text: trimmed,
      audience,
      recipients,
      sendNow,
      scheduledAt
    };

    try {
      if (editingId) {
        await updateScheduledBroadcast(editingId, payload);
      } else {
        await createScheduledBroadcast(payload);
      }
      resetForm();
      await loadPending();
    } catch (err) {
      error('save broadcast:', err);
      setFormError('Не удалось сохранить рассылку');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Сделать рассылку"
      size="large"
      footer={
        <button
          type="submit"
          form="broadcast-form"
          className="submit-btn-full"
          disabled={submitting}
        >
          {submitting ? 'Сохраняем...' : editingId ? 'Сохранить изменения' : 'Запланировать'}
        </button>
      }
    >
      <form id="broadcast-form" onSubmit={handleSubmit}>
        {formError && <p className="admin-modal__error">{formError}</p>}

        <div className="admin-modal__field">
          <label className="admin-modal__label" htmlFor="broadcast-text">
            Текст рассылки
          </label>
          <textarea
            id="broadcast-text"
            className="admin-modal__textarea"
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Текст сообщения в MAX..."
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
        <h3 className="admin-modal__pending-title">Запланированные рассылки</h3>
        {pending.length === 0 ? (
          <p className="admin-modal__empty">Нет запланированных рассылок</p>
        ) : (
          <ul className="admin-modal__pending-list">
            {pending.map((item) => (
              <li key={item.id} className="admin-modal__pending-item">
                <div className="admin-modal__pending-text">
                  {item.text}
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
