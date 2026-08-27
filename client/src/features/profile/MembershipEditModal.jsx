import React, { useEffect, useMemo, useState } from 'react';
import { addMonths, addYears, format, parse } from 'date-fns';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { isModerator } from '../../services/auth';
import pb from '../../services/pb';
import { maybeNotifySessionsLeft } from '../../services/notifications';
import { notifyMembershipTopUp } from '../../services/membershipNotify';
import MembershipPeriodRangeField from './MembershipPeriodRangeField';
import MembershipStartDateField from './MembershipStartDateField';
import './Profile.css';

function getCurrentSessions(user) {
  const value = Number(user?.available_sessions ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getUnpaidSessions(user) {
  const value = Number(user?.unpaid_sessions ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function computeYearEndDate(startDateStr) {
  if (!startDateStr) return '';
  const start = parse(startDateStr, 'yyyy-MM-dd', new Date());
  return format(addYears(start, 1), 'yyyy-MM-dd');
}

function computeTwoMonthEndDate(startDateStr) {
  if (!startDateStr) return '';
  const start = parse(startDateStr, 'yyyy-MM-dd', new Date());
  return format(addMonths(start, 2), 'yyyy-MM-dd');
}

/**
 * @param {string} start
 * @param {string} end
 */
function applyRegularPeriodAuto(start, end) {
  if (start && end && start === end) {
    return { start, end: computeTwoMonthEndDate(start) };
  }
  return { start, end };
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
  const [unpaidSessions, setUnpaidSessions] = useState('0');
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
        unpaidSessions: String(getUnpaidSessions(user)),
        comment: user?.membership_comment || ''
      };
      setMembershipType(snapshot.membershipType);
      setStartDate(snapshot.startDate);
      setEndDate(snapshot.endDate);
      setAvailableSessions(snapshot.availableSessions);
      setUnpaidSessions(snapshot.unpaidSessions);
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

      if (mode === 'add' && newValue > current) {
        await notifyMembershipTopUp(user.id, newValue - current);
      }

      await alert({
        title: copy.successTitle,
        message: `Доступные посещения: ${current} → ${newValue}.`,
        confirmText: 'Ок'
      });

      onClose?.();
      onMutated?.(updated);
    } catch {
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

    if (membershipType === 'one_time') {
      if (typeChanged || initialSnapshot.startDate) {
        payload.membership_start_date = '';
        changedFields.push('membership_start_date');
      }
      if (typeChanged || initialSnapshot.endDate) {
        payload.membership_end_date = '';
        changedFields.push('membership_end_date');
      }
      const sessions = Math.max(0, Number.parseInt(availableSessions, 10) || 0);
      const initialSessions = Number.parseInt(initialSnapshot.availableSessions, 10) || 0;
      if (typeChanged || sessions !== initialSessions) {
        payload.available_sessions = sessions;
        changedFields.push('available_sessions');
      }
    } else if (membershipType === 'regular') {
      let nextStart = startDate;
      let nextEnd = endDate;
      const auto = applyRegularPeriodAuto(nextStart, nextEnd);
      nextStart = auto.start;
      nextEnd = auto.end;

      if (nextStart !== initialSnapshot.startDate) {
        payload.membership_start_date = nextStart || '';
        changedFields.push('membership_start_date');
      }
      if (nextEnd !== initialSnapshot.endDate) {
        payload.membership_end_date = nextEnd || '';
        changedFields.push('membership_end_date');
      }

      const sessions = Math.max(0, Number.parseInt(availableSessions, 10) || 0);
      const initialSessions = Number.parseInt(initialSnapshot.availableSessions, 10) || 0;
      if (typeChanged || sessions !== initialSessions) {
        payload.available_sessions = sessions;
        changedFields.push('available_sessions');
      }
    } else if (membershipType === 'corporate' || membershipType === 'annual') {
      if (startDate !== initialSnapshot.startDate) {
        payload.membership_start_date = startDate || '';
        changedFields.push('membership_start_date');
      }
      const computedEndDate = computeYearEndDate(startDate);
      if (
        typeChanged ||
        startDate !== initialSnapshot.startDate ||
        computedEndDate !== initialSnapshot.endDate
      ) {
        payload.membership_end_date = computedEndDate;
        changedFields.push('membership_end_date');
      }
    }

    const unpaid = Math.max(0, Number.parseInt(unpaidSessions, 10) || 0);
    const initialUnpaid = Number.parseInt(initialSnapshot.unpaidSessions, 10) || 0;
    if (unpaid !== initialUnpaid) {
      payload.unpaid_sessions = unpaid;
      changedFields.push('unpaid_sessions');
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
        if (nextSessions > initialSessions) {
          await notifyMembershipTopUp(user.id, nextSessions - initialSessions);
        }
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
        unpaidSessions: String(getUnpaidSessions(updated)),
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
                  value="one_time"
                  checked={membershipType === 'one_time'}
                  onChange={() => {
                    setMembershipType('one_time');
                    setStartDate('');
                    setEndDate('');
                  }}
                />
                Разовый
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
                  const auto = applyRegularPeriodAuto(start, end);
                  setStartDate(auto.start);
                  setEndDate(auto.end);
                }}
              />
              <div className="form-group">
                <label htmlFor="membership-available-sessions">Доступные посещения</label>
                <input
                  id="membership-available-sessions"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={availableSessions}
                  onChange={(e) => setAvailableSessions(e.target.value.replace(/[^\d]/g, ''))}
                  required
                />
              </div>
            </>
          )}

          {membershipType === 'one_time' && (
            <div className="form-group">
              <label htmlFor="membership-available-sessions-one">Доступные посещения</label>
              <input
                id="membership-available-sessions-one"
                type="number"
                min="0"
                inputMode="numeric"
                value={availableSessions}
                onChange={(e) => setAvailableSessions(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
          )}

          {(membershipType === 'corporate' || membershipType === 'annual') && (
            <MembershipStartDateField
              id="membership-start-date"
              value={startDate}
              onChange={(next) => {
                setStartDate(next);
                setEndDate(computeYearEndDate(next));
              }}
            />
          )}

          <div className="form-group">
            <label htmlFor="membership-unpaid-sessions">Неоплаченные посещения</label>
            <input
              id="membership-unpaid-sessions"
              type="number"
              min="0"
              inputMode="numeric"
              value={unpaidSessions}
              onChange={(e) => setUnpaidSessions(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>

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
