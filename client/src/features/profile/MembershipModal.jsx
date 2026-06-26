import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { isModerator } from '../../services/auth';
import pb from '../../services/pb';
import { auditMembership } from '../../lib/audit';
import { formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';
import MembershipEditModal from './MembershipEditModal';
import './Profile.css';
import '../trainings/Trainings.css';

function formatMembershipDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU');
}

function getMembershipTypeLabel(type) {
  if (type === 'corporate') return 'Корпоративный';
  if (type === 'annual') return 'Годовой';
  return 'Обычный';
}

function MembershipModal({ isOpen, onClose, user, onMutated }) {
  const [editMode, setEditMode] = useState(null);
  const [freezing, setFreezing] = useState(false);
  const moderator = isModerator();
  const [availableSessions, setAvailableSessions] = useState(0);
  const [usedSessions, setUsedSessions] = useState(0);
  const [membershipType, setMembershipType] = useState('regular');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frozen, setFrozen] = useState(false);
  const [frozenAt, setFrozenAt] = useState('');
  const [comment, setComment] = useState('');

  const fetchMembership = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fields = [
        'available_sessions',
        'attendance_count',
        'membership_type',
        'membership_start_date',
        'membership_end_date',
        'membership_frozen',
        'membership_frozen_at'
      ];
      if (moderator) {
        fields.push('membership_comment');
      }

      const fresh = await pb.collection('users').getOne(user.id, {
        fields: fields.join(',')
      });

      setAvailableSessions(Number(fresh.available_sessions ?? 0));
      setUsedSessions(Number(fresh.attendance_count ?? 0));
      setMembershipType(fresh.membership_type || 'regular');
      setStartDate(fresh.membership_start_date || '');
      setEndDate(fresh.membership_end_date || '');
      setFrozen(Boolean(fresh.membership_frozen));
      setFrozenAt(fresh.membership_frozen_at || '');
      if (moderator) {
        setComment(fresh.membership_comment || '');
      }
    } catch (err) {
      error('fetch membership:', err);
    }
  }, [user?.id, moderator]);

  useEffect(() => {
    if (!isOpen) {
      setEditMode(null);
      return;
    }

    setAvailableSessions(Number(user?.available_sessions ?? 0));
    setUsedSessions(Number(user?.attendance_count ?? 0));
    setMembershipType(user?.membership_type || 'regular');
    setStartDate(user?.membership_start_date || '');
    setEndDate(user?.membership_end_date || '');
    setFrozen(Boolean(user?.membership_frozen));
    setFrozenAt(user?.membership_frozen_at || '');
    if (moderator) {
      setComment(user?.membership_comment || '');
    }
    fetchMembership();
  }, [
    isOpen,
    fetchMembership,
    user?.available_sessions,
    user?.attendance_count,
    user?.membership_type,
    user?.membership_start_date,
    user?.membership_end_date,
    user?.membership_frozen,
    user?.membership_frozen_at,
    user?.membership_comment,
    moderator
  ]);

  const applyMembership = (record) => {
    if (!record) return;
    setAvailableSessions(Number(record.available_sessions ?? 0));
    setUsedSessions(Number(record.attendance_count ?? 0));
    setMembershipType(record.membership_type || 'regular');
    setStartDate(record.membership_start_date || '');
    setEndDate(record.membership_end_date || '');
    setFrozen(Boolean(record.membership_frozen));
    setFrozenAt(record.membership_frozen_at || '');
    if (moderator) {
      setComment(record.membership_comment || '');
    }
  };

  const handleMutated = async (updated) => {
    if (updated) {
      applyMembership(updated);
    } else {
      await fetchMembership();
    }
    onMutated?.(updated);
    setEditMode(null);
  };

  const handleFreezeToggle = async () => {
    if (!moderator || !user?.id || freezing) return;

    setFreezing(true);
    try {
      let updated;
      if (frozen) {
        const frozenAtDate = new Date(frozenAt);
        const nowDate = new Date();
        const frozenMs = nowDate.getTime() - frozenAtDate.getTime();
        const frozenDays = Math.ceil(frozenMs / 86_400_000);

        let updatedEndDate = endDate;
        if (endDate && frozenDays > 0) {
          const end = new Date(endDate);
          end.setDate(end.getDate() + frozenDays);
          updatedEndDate = end.toISOString().slice(0, 10);
        }

        updated = await pb.collection('users').update(user.id, {
          membership_frozen: false,
          ...(updatedEndDate !== endDate ? { membership_end_date: updatedEndDate } : {})
        });

        auditMembership.membershipUnfrozen(user.id, { extendedDays: frozenDays });
      } else {
        updated = await pb.collection('users').update(user.id, {
          membership_frozen: true,
          membership_frozen_at: new Date().toISOString()
        });
        auditMembership.membershipFrozen(user.id);
      }

      applyMembership(updated);
      onMutated?.(updated);
    } catch (err) {
      error('toggle membership freeze:', err);
    } finally {
      setFreezing(false);
    }
  };

  const isCorporate = membershipType === 'corporate';
  const isAnnual = membershipType === 'annual';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Абонемент"
        showCloseButton={false}
      >
        <div className="detail-header-row">
          <span className="detail-badge-type">Посещения</span>
          <div className="detail-header-actions">
            {moderator && (
              <>
                <IconButton
                  ariaLabel="Редактировать абонемент"
                  variant="ghost"
                  size="sm"
                  className="action-circle-btn btn-edit"
                  onClick={() => setEditMode('full')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
                    <path d="m13.7 6.1 4.2 4.2" />
                  </svg>
                </IconButton>
                <IconButton
                  ariaLabel="Добавить посещения"
                  variant="ghost"
                  size="sm"
                  className="action-circle-btn btn-add-plus membership-add-sessions-btn"
                  onClick={() => setEditMode('add')}
                >
                  <span aria-hidden="true">+</span>
                </IconButton>
                <IconButton
                  ariaLabel="Уменьшить посещения"
                  variant="ghost"
                  size="sm"
                  className="action-circle-btn btn-cancel-cross"
                  onClick={() => setEditMode('subtract')}
                >
                  <span aria-hidden="true">-</span>
                </IconButton>
              </>
            )}
            <IconButton
              type="button"
              className="ui-modal-close"
              ariaLabel="Закрыть"
              onClick={onClose}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          </div>
        </div>

        <div className="profile-meta-info membership-info">
          <p><strong>Тип абонемента:</strong> {getMembershipTypeLabel(membershipType)}</p>
          <p>
            <strong>Доступно:</strong>{' '}
            {isCorporate ? '∞' : isAnnual ? '∞ (1 в день)' : availableSessions}
          </p>
          <p><strong>Использовано:</strong> {usedSessions}</p>
          {!isCorporate && (startDate || endDate) && (
            <p>
              <strong>Период:</strong>{' '}
              {formatMembershipDate(startDate)} — {formatMembershipDate(endDate)}
            </p>
          )}
          {frozen && frozenAt && (
            <p className="membership-frozen-notice">
              <strong>Заморожен с:</strong> {formatPostDate(frozenAt)}
            </p>
          )}
          {moderator && comment && (
            <p className="membership-comment-display">
              <strong>Комментарий:</strong> {comment}
            </p>
          )}
        </div>

        {moderator && (
          <button
            type="button"
            className={`membership-freeze-btn${frozen ? ' membership-freeze-btn--unfreeze' : ''}`}
            onClick={handleFreezeToggle}
            disabled={freezing}
          >
            {freezing ? 'Сохраняем...' : frozen ? 'Разморозить' : 'Заморозить'}
          </button>
        )}
      </Modal>

      <MembershipEditModal
        isOpen={Boolean(editMode)}
        onClose={() => setEditMode(null)}
        user={user}
        mode={editMode}
        onMutated={handleMutated}
      />
    </>
  );
}

export default MembershipModal;
