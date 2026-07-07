import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { useToast } from '../../components/ui/ToastContext';
import { MAX_SELLER_URL } from '../../config';
import { isModerator } from '../../services/auth';
import pb from '../../services/pb';
import { auditMembership } from '../../lib/audit';
import { formatPostDate, pluralize } from '../../lib/format';
import { error } from '../../lib/log';
import {
  BUY_MOBILE_TOAST_ACTION_LABEL,
  isMobileMaxPlatform,
  openSellerChat
} from '../shop/buyMessage';
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

function parseFreezeLog(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatFreezeLogEntry(entry, index, total) {
  const from = formatMembershipDate(entry.frozen_at);
  const isActive = !entry.unfrozen_at && index === total - 1;

  if (isActive) {
    return `${from} — по сей день (активна)`;
  }

  if (!entry.unfrozen_at) {
    return `${from} — —`;
  }

  const to = formatMembershipDate(entry.unfrozen_at);
  const frozenMs = new Date(entry.unfrozen_at).getTime() - new Date(entry.frozen_at).getTime();
  const days = Math.max(1, Math.ceil(frozenMs / 86_400_000));
  const dayLabel = pluralize(days, 'день', 'дня', 'дней');
  return `${from} — ${to} (${days} ${dayLabel})`;
}

function MembershipModal({ isOpen, onClose, user, onMutated }) {
  const { showToast } = useToast();
  const [userSnapshot, setUserSnapshot] = useState(user);
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
  const [freezeLog, setFreezeLog] = useState([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (user) {
      setUserSnapshot(user);
    }
  }, [user]);

  const fetchMembership = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fields = [
        'available_sessions',
        'used_sessions',
        'membership_type',
        'membership_start_date',
        'membership_end_date',
        'membership_frozen',
        'membership_frozen_at',
        'membership_freeze_log'
      ];
      if (moderator) {
        fields.push('membership_comment');
      }

      const fresh = await pb.collection('users').getOne(user.id, {
        fields: fields.join(',')
      });

      setAvailableSessions(Number(fresh.available_sessions ?? 0));
      setUsedSessions(Number(fresh.used_sessions ?? 0));
      setMembershipType(fresh.membership_type || 'regular');
      setStartDate(fresh.membership_start_date || '');
      setEndDate(fresh.membership_end_date || '');
      setFrozen(Boolean(fresh.membership_frozen));
      setFrozenAt(fresh.membership_frozen_at || '');
      setFreezeLog(parseFreezeLog(fresh.membership_freeze_log));
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
    setUsedSessions(Number(user?.used_sessions ?? 0));
    setMembershipType(user?.membership_type || 'regular');
    setStartDate(user?.membership_start_date || '');
    setEndDate(user?.membership_end_date || '');
    setFrozen(Boolean(user?.membership_frozen));
    setFrozenAt(user?.membership_frozen_at || '');
    setFreezeLog(parseFreezeLog(user?.membership_freeze_log));
    if (moderator) {
      setComment(user?.membership_comment || '');
    }
    fetchMembership();
  }, [
    isOpen,
    fetchMembership,
    user?.available_sessions,
    user?.used_sessions,
    user?.membership_type,
    user?.membership_start_date,
    user?.membership_end_date,
    user?.membership_frozen,
    user?.membership_frozen_at,
    user?.membership_freeze_log,
    user?.membership_comment,
    moderator
  ]);

  const applyMembership = (record) => {
    if (!record) return;
    setAvailableSessions(Number(record.available_sessions ?? 0));
    setUsedSessions(Number(record.used_sessions ?? 0));
    setMembershipType(record.membership_type || 'regular');
    setStartDate(record.membership_start_date || '');
    setEndDate(record.membership_end_date || '');
    setFrozen(Boolean(record.membership_frozen));
    setFrozenAt(record.membership_frozen_at || '');
    setFreezeLog(parseFreezeLog(record.membership_freeze_log));
    if (moderator) {
      setComment(record.membership_comment || '');
    }
  };

  const handleMutated = async (updated) => {
    if (updated) {
      applyMembership(updated);
      setUserSnapshot((prev) => ({ ...prev, ...updated }));
    } else {
      await fetchMembership();
    }
    onMutated?.(updated);
    setEditMode(null);
  };

  const handleBuyClick = useCallback(() => {
    if (isMobileMaxPlatform()) {
      showToast({
        text: 'Чат с администратором',
        actionLabel: BUY_MOBILE_TOAST_ACTION_LABEL,
        onAction: () => openSellerChat(MAX_SELLER_URL)
      });
      return;
    }

    openSellerChat(MAX_SELLER_URL);
  }, [showToast]);

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

        const log = [...freezeLog];
        if (log.length > 0) {
          log[log.length - 1].unfrozen_at = new Date().toISOString();
        }

        updated = await pb.collection('users').update(user.id, {
          membership_frozen: false,
          membership_freeze_log: log,
          ...(updatedEndDate !== endDate ? { membership_end_date: updatedEndDate } : {})
        });

        auditMembership.membershipUnfrozen(user.id, { extendedDays: frozenDays });
      } else {
        const newEntry = { frozen_at: new Date().toISOString(), unfrozen_at: null };
        const updatedLog = [...freezeLog, newEntry];

        updated = await pb.collection('users').update(user.id, {
          membership_frozen: true,
          membership_frozen_at: newEntry.frozen_at,
          membership_freeze_log: updatedLog
        });
        auditMembership.membershipFrozen(user.id);
      }

      applyMembership(updated);
      setUserSnapshot((prev) => ({ ...prev, ...updated }));
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
          {freezeLog.length > 0 && (
            <div className="membership-freeze-history">
              <p><strong>История заморозок:</strong></p>
              <ul className="membership-freeze-history-list">
                {freezeLog.map((entry, index) => (
                  <li key={`${entry.frozen_at}-${index}`}>
                    {formatFreezeLogEntry(entry, index, freezeLog.length)}
                  </li>
                ))}
              </ul>
            </div>
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

        {!moderator && (
          <button
            type="button"
            className="membership-buy-btn"
            onClick={handleBuyClick}
          >
            Купить
          </button>
        )}
      </Modal>

      <MembershipEditModal
        isOpen={Boolean(editMode)}
        onClose={() => setEditMode(null)}
        user={userSnapshot}
        mode={editMode}
        onMutated={handleMutated}
      />
    </>
  );
}

export default MembershipModal;
