import React, { useEffect, useMemo, useState } from 'react';
import { addYears, format, parse } from 'date-fns';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { isModerator } from '../../services/auth';
import pb from '../../services/pb';
import { auditMembership } from '../../lib/audit';
import { maybeNotifySessionsLeft } from '../../services/notifications';
import MembershipPeriodRangeField from './MembershipPeriodRangeField';
import MembershipStartDateField from './MembershipStartDateField';
import './Profile.css';

function getCurrentSessions(user) {
  const value = Number(user?.available_sessions ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function computeAnnualEndDate(startDateStr) {
  if (!startDateStr) return '';
  const start = parse(startDateStr, 'yyyy-MM-dd', new Date());
  return format(addYears(start, 1), 'yyyy-MM-dd');
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

      await maybeNotifySessionsLeft(user.id, current, newValue, user.membership_type || 'regular');

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

    const typeChanged = membershipType !== initialSnapshot.membershipType;
    if (typeChanged) {
      payload.membership_type = membershipType;
      changedFields.push('membership_type');
    }

    if (
      membershipType === 'regular' ||
      membershipType === 'annual' ||
      membershipType === 'corporate'
    ) {
      if (startDate !== initialSnapshot.startDate) {
        payload.membership_start_date = startDate || '';
        changedFields.push('membership_start_date');
      }

      if (membershipType === 'annual') {
        const computedEndDate = computeAnnualEndDate(startDate);
        if (
          typeChanged ||
          startDate !== initialSnapshot.startDate ||
          computedEndDate !== initialSnapshot.endDate
        ) {
          payload.membership_end_date = computedEndDate;
          changedFields.push('membership_end_date');
        }
      } else {
        const effectiveEndDate = endDate || startDate;
        if (effectiveEndDate !== initialSnapshot.endDate) {
          payload.membership_end_date = effectiveEndDate || '';
          changedFields.push('membership_end_date');
        }
      }

      if (membershipType === 'regular') {
        const sessions = Math.max(0, Number.parseInt(availableSessions, 10) || 0);
        const initialSessions = Number.parseInt(initialSnapshot.availableSessions, 10) || 0;
        if (typeChanged || sessions !== initialSessions) {
          payload.available_sessions = sessions;
          changedFields.push('available_sessions');
        }
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

      if (payload.available_sessions !== undefined) {
        const initialSessions = Number.parseInt(initialSnapshot.availableSessions, 10) || 0;
        const nextSessions = getCurrentSessions(updated);
        await maybeNotifySessionsLeft(
          user.id,
          initialSessions,
          nextSessions,
          updated.membership_type || membershipType
        );
      }

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

      setInitialSnapshot({
        membershipType: updated.membership_type || membershipType,
        startDate: normalizeDateInput(updated.membership_start_date ?? startDate),
        endDate: normalizeDateInput(updated.membership_end_date ?? endDate),
        availableSessions: String(getCurrentSessions(updated)),
        comment: updated.membership_comment ?? comment
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
                    if (membershipType === 'corporate' || membershipType === 'annual') {
                      setAvailableSessions('0');
                    }
                    setMembershipType('regular');
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
              <label className="membership-type-option">
                <input
                  type="radio"
                  name="membership-type"
                  value="annual"
                  checked={membershipType === 'annual'}
                  onChange={() => setMembershipType('annual')}
                />
                Годовой
              </label>
            </div>
          </div>

          {membershipType === 'regular' && (
            <>
              <MembershipPeriodRangeField
                id="membership-period-range"
                label="Период действия"
                startDate={startDate}
                endDate={endDate}
                onChange={({ start, end }) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
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

          {(membershipType === 'corporate' || membershipType === 'annual') && (
            <MembershipStartDateField
              id="membership-start-date"
              value={startDate}
              onChange={setStartDate}
            />
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
