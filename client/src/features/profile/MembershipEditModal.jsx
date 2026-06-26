import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { isModerator } from '../../services/auth';
import pb from '../../services/pb';
import { auditMembership } from '../../lib/audit';
import './Profile.css';

function getCurrentSessions(user) {
  const value = Number(user?.available_sessions ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function getModeCopy(mode) {
  if (mode === 'full') {
    return {
      title: 'Редактировать абонемент',
      successTitle: 'Абонемент обновлён'
    };
  }

  return mode === 'subtract'
    ? {
        title: 'Уменьшить посещения',
        successTitle: 'Посещения уменьшены'
      }
    : {
        title: 'Добавить посещения',
        successTitle: 'Добавлены посещения'
      };
}

function MembershipEditModal({ isOpen, onClose, user, mode = 'add', onMutated }) {
  const { alert } = useAlertDialog();
  const moderator = isModerator();
  const [amount, setAmount] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const [membershipType, setMembershipType] = useState('regular');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableSessions, setAvailableSessions] = useState('0');
  const [comment, setComment] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  const copy = useMemo(() => getModeCopy(mode), [mode]);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'full') {
      const snapshot = {
        membershipType: user?.membership_type || 'regular',
        startDate: normalizeDateInput(user?.membership_start_date),
        endDate: normalizeDateInput(user?.membership_end_date),
        availableSessions: String(getCurrentSessions(user)),
        comment: user?.membership_comment || ''
      };
      setMembershipType(snapshot.membershipType);
      setStartDate(snapshot.startDate);
      setEndDate(snapshot.endDate);
      setAvailableSessions(snapshot.availableSessions);
      setComment(snapshot.comment);
      setInitialSnapshot(snapshot);
      return;
    }

    setAmount('1');
  }, [isOpen, mode, user]);

  const handleSessionsSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !user?.id) return;

    const delta = Number.parseInt(amount, 10);
    if (!Number.isFinite(delta) || delta < 1) {
      await alert({ title: 'Ошибка', message: 'Введите количество посещений от 1.' });
      return;
    }

    const current = getCurrentSessions(user);
    const newValue = mode === 'subtract' ? Math.max(0, current - delta) : current + delta;

    setSubmitting(true);
    try {
      const updated = await pb.collection('users').update(user.id, { available_sessions: newValue });

      if (mode === 'subtract') {
        auditMembership.sessionsSubtracted(user.id, delta, newValue);
      } else {
        auditMembership.sessionsAdded(user.id, delta, newValue);
      }

      await alert({
        title: copy.successTitle,
        message: `Доступные посещения: ${current} → ${newValue}.`,
        confirmText: 'Ок'
      });

      onClose?.();
      onMutated?.(updated);
    } catch (err) {
      if (mode === 'subtract') {
        auditMembership.sessionsSubtractError(err, user.id);
      } else {
        auditMembership.sessionsAddError(err, user.id);
      }

      await alert({
        title: 'Ошибка',
        message: 'Не удалось изменить количество посещений.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFullSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !user?.id || !initialSnapshot) return;

    const payload = {};
    const changedFields = [];

    if (membershipType !== initialSnapshot.membershipType) {
      payload.membership_type = membershipType;
      changedFields.push('membership_type');
      if (membershipType === 'regular' && initialSnapshot.membershipType === 'corporate') {
        payload.available_sessions = 0;
        changedFields.push('available_sessions');
      }
    }

    if (membershipType === 'regular') {
      if (startDate !== initialSnapshot.startDate) {
        payload.membership_start_date = startDate || '';
        changedFields.push('membership_start_date');
      }
      if (endDate !== initialSnapshot.endDate) {
        payload.membership_end_date = endDate || '';
        changedFields.push('membership_end_date');
      }

      const sessions = Math.max(0, Number.parseInt(availableSessions, 10) || 0);
      const initialSessions = Number.parseInt(initialSnapshot.availableSessions, 10) || 0;
      if (sessions !== initialSessions && !('available_sessions' in payload)) {
        payload.available_sessions = sessions;
        changedFields.push('available_sessions');
      }
    }

    if (moderator && comment !== initialSnapshot.comment) {
      payload.membership_comment = comment;
      changedFields.push('membership_comment');
    }

    if (changedFields.length === 0) {
      onClose?.();
      return;
    }

    setSubmitting(true);
    try {
      const updated = await pb.collection('users').update(user.id, payload);

      if (payload.membership_type && payload.membership_type !== initialSnapshot.membershipType) {
        auditMembership.membershipTypeChanged(
          user.id,
          initialSnapshot.membershipType,
          payload.membership_type
        );
      }

      const otherFields = changedFields.filter((field) => field !== 'membership_type');
      if (otherFields.length > 0) {
        auditMembership.membershipEdited(user.id, otherFields);
      }

      await alert({
        title: copy.successTitle,
        message: 'Данные абонемента сохранены.',
        confirmText: 'Ок'
      });

      onClose?.();
      onMutated?.(updated);
    } catch {
      await alert({
        title: 'Ошибка',
        message: 'Не удалось сохранить абонемент.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'full') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={copy.title}>
        <form onSubmit={handleFullSubmit} className="profile-edit-form">
          <div className="form-group">
            <span className="form-group-label">Тип абонемента</span>
            <div className="membership-type-options">
              <label className="membership-type-option">
                <input
                  type="radio"
                  name="membership-type"
                  value="regular"
                  checked={membershipType === 'regular'}
                  onChange={() => {
                    setMembershipType('regular');
                    if (initialSnapshot?.membershipType === 'corporate') {
                      setAvailableSessions('0');
                    }
                  }}
                />
                Обычный
              </label>
              <label className="membership-type-option">
                <input
                  type="radio"
                  name="membership-type"
                  value="corporate"
                  checked={membershipType === 'corporate'}
                  onChange={() => setMembershipType('corporate')}
                />
                Корпоративный
              </label>
            </div>
          </div>

          {membershipType === 'regular' && (
            <>
              <div className="form-group">
                <label htmlFor="membership-start-date">Начало периода</label>
                <input
                  id="membership-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="membership-end-date">Конец периода</label>
                <input
                  id="membership-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="membership-available-sessions">Доступные посещения</label>
                <input
                  id="membership-available-sessions"
                  type="number"
                  min="0"
                  value={availableSessions}
                  onChange={(e) => setAvailableSessions(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {moderator && (
            <div className="form-group">
              <label htmlFor="membership-comment">Комментарий</label>
              <textarea
                id="membership-comment"
                className="profile-reason-textarea membership-comment-textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <button type="submit" className="save-profile-btn" disabled={submitting || !user?.id}>
            {submitting ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={copy.title}>
      <form onSubmit={handleSessionsSubmit} className="profile-edit-form">
        <div className="form-group">
          <label htmlFor="membership-sessions-amount">Количество посещений</label>
          <input
            id="membership-sessions-amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="save-profile-btn" disabled={submitting || !user?.id}>
          {submitting ? 'Сохраняем...' : 'Подтвердить'}
        </button>
      </form>
    </Modal>
  );
}

export default MembershipEditModal;
