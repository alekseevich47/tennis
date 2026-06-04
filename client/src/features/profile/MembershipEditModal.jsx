import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import pb from '../../services/pb';
import { auditMembership } from '../../lib/audit';
import './Profile.css';

function getCurrentSessions(user) {
  const value = Number(user?.available_sessions ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getModeCopy(mode) {
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
  const [amount, setAmount] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const copy = useMemo(() => getModeCopy(mode), [mode]);

  useEffect(() => {
    if (isOpen) {
      setAmount('1');
    }
  }, [isOpen, mode]);

  const handleSubmit = async (e) => {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={copy.title}>
      <form onSubmit={handleSubmit} className="profile-edit-form">
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
