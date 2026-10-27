import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import { MAX_SELLER_URL } from '../../config';
import { getCurrentUser, isModerator } from '../../services/auth';
import pb from '../../services/pb';
import {
  freezeMembership,
  unfreezeMembership,
  stopMembership,
  startMembership
} from '../../services/membershipLifecycle';
import { useTrainings } from '../../hooks/useTrainings';
import { formatPostDate, pluralize } from '../../lib/format';
import { error } from '../../lib/log';
import {
  BUY_MOBILE_TOAST_ACTION_LABEL,
  isMobileMaxPlatform,
  openSellerChat
} from '../shop/buyMessage';
import MembershipEditModal from './MembershipEditModal';
import MembershipHistory from './MembershipHistory';
import CollapsibleHistorySection from './CollapsibleHistorySection';
import TrainingDetailModal from '../trainings/TrainingDetailModal';
import { countUpcomingBookings } from './upcomingTrainings';
import './Profile.css';
import '../trainings/Trainings.css';

const FREEZE_BUDGET_DAYS = 30;
const FOOTER_IDLE_MS = 1000;

function formatMembershipDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU');
}

function getMembershipTypeLabel(type) {
  if (type === 'corporate') return 'Корпоративный';
  if (type === 'annual') return 'Годовой';
  if (type === 'one_time') return 'Разовый';
  return 'Обычный';
}

function parseJsonLog(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {any} entry
 * @param {boolean} isActive
 */
function formatFreezeLogEntry(entry, isActive) {
  const from = formatMembershipDate(entry.frozen_at);

  if (isActive) {
    return `${from} — активна`;
  }

  if (!entry.unfrozen_at) {
    return `${from} — —`;
  }

  const to = formatMembershipDate(entry.unfrozen_at);
  const days =
    entry.days_charged != null
      ? Number(entry.days_charged)
      : Math.max(
          1,
          Math.ceil(
            (new Date(entry.unfrozen_at).getTime() - new Date(entry.frozen_at).getTime()) /
              86_400_000
          )
        );
  const dayLabel = pluralize(days, 'день', 'дня', 'дней');
  return `${from} — ${to} (${days} ${dayLabel})`;
}

/**
 * Лог хронологически (старые → новые); активна последняя незакрытая запись.
 * @param {any[]} freezeLog
 * @returns {{ entry: any, isActive: boolean, key: string }[]}
 */
function buildFreezeHistoryItemsNewestFirst(freezeLog) {
  let lastOpenIndex = -1;
  for (let i = 0; i < freezeLog.length; i += 1) {
    if (!freezeLog[i]?.unfrozen_at) lastOpenIndex = i;
  }
  return freezeLog
    .map((entry, index) => ({
      entry,
      isActive: index === lastOpenIndex && !entry.unfrozen_at,
      key: `${entry.kind || 'freeze'}-${entry.frozen_at}-${index}`
    }))
    .reverse();
}

/**
 * @param {any[]} periodLog
 * @param {{ type: string, start: string, end: string }} current
 */
function buildPeriodHistoryItems(periodLog, current) {
  const items = periodLog.map((entry) => ({
    type: entry.type || 'regular',
    start: entry.start || '',
    end: entry.end || '',
    closed: Boolean(entry.closed_at)
  }));

  const last = items[items.length - 1];
  const sameOpen =
    last &&
    !last.closed &&
    last.type === current.type &&
    last.start === current.start &&
    last.end === current.end;

  if (!sameOpen && (current.type || current.start || current.end)) {
    items.push({
      type: current.type,
      start: current.start,
      end: current.end,
      closed: false
    });
  }

  return items;
}

/**
 * @param {{ type: string, start: string, end: string, closed: boolean }} entry
 */
function formatPeriodEntry(entry) {
  const label = getMembershipTypeLabel(entry.type);
  const from = entry.start ? formatMembershipDate(entry.start) : '—';
  if (!entry.closed && !entry.end) {
    return `${label}: ${from} — по н.в.`;
  }
  if (!entry.closed) {
    return `${label}: ${from} — ${entry.end ? formatMembershipDate(entry.end) : 'по н.в.'}`;
  }
  return `${label}: ${from} — ${entry.end ? formatMembershipDate(entry.end) : '—'}`;
}

const TRAINING_EXPAND =
  'booked_users,attended_users,unbooked_users,moderator_kicked_users,restore_insufficient_users';

function MembershipModal({ isOpen, onClose, user, onMutated }) {
  const { showToast } = useToast();
  const { alert, confirm } = useAlertDialog();
  const { data: trainings } = useTrainings();
  const [userSnapshot, setUserSnapshot] = useState(user);
  const [editMode, setEditMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const moderator = isModerator();
  const currentUserId = getCurrentUser()?.id;
  const canSeeUpcomingBookings = Boolean(
    moderator || (user?.id && currentUserId && user.id === currentUserId)
  );
  const upcomingBookingsCount = useMemo(
    () => (canSeeUpcomingBookings ? countUpcomingBookings(trainings, user?.id) : 0),
    [canSeeUpcomingBookings, trainings, user?.id]
  );
  const [availableSessions, setAvailableSessions] = useState(0);
  const [usedSessions, setUsedSessions] = useState(0);
  const [unpaidSessions, setUnpaidSessions] = useState(0);
  const [membershipType, setMembershipType] = useState('regular');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frozen, setFrozen] = useState(false);
  const [frozenAt, setFrozenAt] = useState('');
  const [plannedUntil, setPlannedUntil] = useState('');
  const [freezeUsedDays, setFreezeUsedDays] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [stoppedAt, setStoppedAt] = useState('');
  const [freezeLog, setFreezeLog] = useState([]);
  const [periodLog, setPeriodLog] = useState([]);
  const [comment, setComment] = useState('');
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const [selectedTraining, setSelectedTraining] = useState(/** @type {any | null} */ (null));
  const [footerHidden, setFooterHidden] = useState(false);
  const bodyRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const scrollIdleRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  useEffect(() => {
    if (user) {
      setUserSnapshot(user);
    }
  }, [user]);

  const applyMembership = useCallback(
    (record) => {
      if (!record) return;
      setAvailableSessions(Number(record.available_sessions ?? 0));
      setUsedSessions(Number(record.used_sessions ?? 0));
      setUnpaidSessions(Number(record.unpaid_sessions ?? 0));
      setMembershipType(record.membership_type || 'regular');
      setStartDate(record.membership_start_date || '');
      setEndDate(record.membership_end_date || '');
      setFrozen(Boolean(record.membership_frozen));
      setFrozenAt(record.membership_frozen_at || '');
      setPlannedUntil(record.membership_freeze_planned_until || '');
      setFreezeUsedDays(Number(record.membership_freeze_used_days ?? 0));
      setStopped(Boolean(record.membership_stopped));
      setStoppedAt(record.membership_stopped_at || '');
      setFreezeLog(parseJsonLog(record.membership_freeze_log));
      setPeriodLog(parseJsonLog(record.membership_period_log));
      if (moderator && record.membership_comment != null) {
        setComment(record.membership_comment || '');
      }
    },
    [moderator]
  );

  const fetchMembership = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fields = [
        'available_sessions',
        'used_sessions',
        'unpaid_sessions',
        'membership_type',
        'membership_start_date',
        'membership_end_date',
        'membership_frozen',
        'membership_frozen_at',
        'membership_freeze_planned_until',
        'membership_freeze_used_days',
        'membership_freeze_log',
        'membership_period_log',
        'membership_stopped',
        'membership_stopped_at'
      ];
      if (moderator) {
        fields.push('membership_comment');
      }

      const fresh = await pb.collection('users').getOne(user.id, {
        fields: fields.join(','),
        requestKey: null
      });
      applyMembership(fresh);
    } catch (err) {
      error('fetch membership:', err);
    }
  }, [user?.id, moderator, applyMembership]);

  useEffect(() => {
    if (!isOpen) {
      setEditMode(null);
      setSelectedTraining(null);
      setFooterHidden(false);
      return;
    }

    applyMembership({
      available_sessions: user?.available_sessions,
      used_sessions: user?.used_sessions,
      unpaid_sessions: user?.unpaid_sessions,
      membership_type: user?.membership_type,
      membership_start_date: user?.membership_start_date,
      membership_end_date: user?.membership_end_date,
      membership_frozen: user?.membership_frozen,
      membership_frozen_at: user?.membership_frozen_at,
      membership_freeze_planned_until: user?.membership_freeze_planned_until,
      membership_freeze_used_days: user?.membership_freeze_used_days,
      membership_freeze_log: user?.membership_freeze_log,
      membership_period_log: user?.membership_period_log,
      membership_stopped: user?.membership_stopped,
      membership_stopped_at: user?.membership_stopped_at,
      membership_comment: user?.membership_comment
    });
    fetchMembership();
  }, [isOpen, fetchMembership, applyMembership, user]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const el = bodyRef.current;
    if (!el) return undefined;

    const onScroll = () => {
      setFooterHidden(true);
      if (scrollIdleRef.current) clearTimeout(scrollIdleRef.current);
      scrollIdleRef.current = setTimeout(() => {
        setFooterHidden(false);
      }, FOOTER_IDLE_MS);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollIdleRef.current) clearTimeout(scrollIdleRef.current);
    };
  }, [isOpen]);

  const handleMutated = async (updated) => {
    if (updated) {
      applyMembership(updated);
      setUserSnapshot((prev) => ({ ...prev, ...updated }));
    } else {
      await fetchMembership();
    }
    onMutated?.(updated);
    setEditMode(null);
    setLedgerRefreshKey((k) => k + 1);
  };

  const handleOpenTraining = useCallback(
    async (trainingId) => {
      try {
        const full = await pb.collection('trainings').getOne(trainingId, {
          expand: TRAINING_EXPAND
        });
        setSelectedTraining(full);
      } catch (err) {
        if (err?.status === 404) {
          showToast({ text: 'Тренировка удалена' });
        } else {
          error('open training from membership history:', err);
        }
      }
    },
    [showToast]
  );

  const handleTrainingMutated = useCallback(async () => {
    if (selectedTraining?.id) {
      try {
        const full = await pb.collection('trainings').getOne(selectedTraining.id, {
          expand: TRAINING_EXPAND
        });
        setSelectedTraining(full);
      } catch {
        /* ignore */
      }
    }
    await fetchMembership();
    setLedgerRefreshKey((k) => k + 1);
  }, [selectedTraining?.id, fetchMembership]);

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

  const remainingFreeze = Math.max(0, FREEZE_BUDGET_DAYS - freezeUsedDays);
  const canFreezeType = membershipType === 'regular' || membershipType === 'annual';
  const canStopType =
    membershipType === 'regular' ||
    membershipType === 'corporate' ||
    membershipType === 'annual';
  const showFreezeButton = canFreezeType;
  const freezeDisabled = stopped || busy || (!frozen && remainingFreeze < 1);

  const runFreezeToggle = async () => {
    if (!user?.id || busy || freezeDisabled) return;
    setBusy(true);
    try {
      const res = frozen
        ? await unfreezeMembership(moderator ? user.id : undefined)
        : await freezeMembership(moderator ? user.id : undefined);
      const updated = res?.user || res;
      applyMembership(updated);
      setUserSnapshot((prev) => ({ ...prev, ...updated }));
      onMutated?.(updated);
      setLedgerRefreshKey((k) => k + 1);
      showToast({
        text: frozen ? 'Абонемент разморожен' : 'Абонемент заморожен'
      });
    } catch (err) {
      error('membership freeze:', err);
      await alert({
        title: 'Ошибка',
        message: err?.message || 'Не удалось изменить заморозку'
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFreezeClick = async () => {
    if (!showFreezeButton || freezeDisabled) return;
    if (frozen) {
      await runFreezeToggle();
      return;
    }
    const ok = await confirm({
      title: 'Заморозить абонемент?',
      message:
        `Записи на ещё не начавшиеся тренировки будут сняты, посещения вернутся.\n` +
        `Остаток бюджета заморозки: ${remainingFreeze} из ${FREEZE_BUDGET_DAYS} ${pluralize(FREEZE_BUDGET_DAYS, 'день', 'дня', 'дней')}.\n` +
        `Плановая длительность — до ${remainingFreeze} ${pluralize(remainingFreeze, 'дня', 'дней', 'дней')}.\n` +
        `Продление срока — целыми днями фактической паузы; короче суток не списывает бюджет и не продлевает абонемент.`,
      confirmText: 'Заморозить',
      cancelText: 'Отмена'
    });
    if (ok) await runFreezeToggle();
  };

  const handleStopToggle = async () => {
    if (!moderator || !user?.id || busy || !canStopType) return;
    if (!stopped) {
      const ok = await confirm({
        title: 'Остановить абонемент?',
        message:
          'Записи на ещё не начавшиеся тренировки будут сняты, посещения вернутся. ' +
          'Запись на тренировки будет недоступна, пока абонемент остановлен.',
        confirmText: 'Остановить',
        cancelText: 'Отмена',
        confirmVariant: 'danger'
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = stopped
        ? await startMembership(user.id)
        : await stopMembership(user.id);
      const updated = res?.user || res;
      applyMembership(updated);
      setUserSnapshot((prev) => ({ ...prev, ...updated }));
      onMutated?.(updated);
      setLedgerRefreshKey((k) => k + 1);
      showToast({ text: stopped ? 'Абонемент запущен' : 'Абонемент остановлен' });
    } catch (err) {
      error('membership stop:', err);
      await alert({
        title: 'Ошибка',
        message: err?.message || 'Не удалось изменить статус'
      });
    } finally {
      setBusy(false);
    }
  };

  const isCorporate = membershipType === 'corporate';
  const isAnnual = membershipType === 'annual';
  const isOneTime = membershipType === 'one_time';
  const isUnlimitedDaily = isCorporate || isAnnual;
  const showPeriod = !isOneTime && (startDate || endDate);

  const headerActions = (
    <div className="membership-modal-header-actions">
      {moderator && (
        <>
          <IconButton
            ariaLabel="Редактировать абонемент"
            variant="ghost"
            size="sm"
            className="action-circle-btn membership-edit-circle-btn"
            onClick={() => setEditMode('full')}
            disabled={busy}
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
          {canStopType && (
            <IconButton
              ariaLabel={stopped ? 'Запустить абонемент' : 'Остановить абонемент'}
              variant="ghost"
              size="sm"
              className={`action-circle-btn btn-stop${stopped ? ' btn-stop-play' : ''}`}
              onClick={handleStopToggle}
              disabled={busy}
            >
              {stopped ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path fill="currentColor" d="M8 5v14l11-7L8 5Z" />
                </svg>
              ) : (
                <span aria-hidden="true">■</span>
              )}
            </IconButton>
          )}
        </>
      )}
    </div>
  );

  const footer = (
    <div className="membership-modal-footer">
      {!moderator && (
        <button type="button" className="membership-buy-btn" onClick={handleBuyClick}>
          Купить
        </button>
      )}
      {showFreezeButton && (
        <button
          type="button"
          className={`membership-freeze-btn${frozen ? ' membership-freeze-btn--unfreeze' : ''}${
            freezeDisabled && !frozen ? ' membership-freeze-btn--disabled-grey' : ''
          }`}
          onClick={handleFreezeClick}
          disabled={freezeDisabled}
        >
          {busy ? 'Сохраняем...' : frozen ? 'Разморозить' : 'Заморозить'}
        </button>
      )}
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Абонемент"
        showCloseButton
        headerActions={headerActions}
        footer={footer}
        bodyRef={bodyRef}
        className={`membership-modal${footerHidden ? ' membership-modal--footer-hidden' : ''}`}
      >
        <div className="profile-meta-info membership-info">
          <p>
            <strong>Тип абонемента:</strong> {getMembershipTypeLabel(membershipType)}
          </p>
          <p>
            <strong>Доступно:</strong>{' '}
            {isUnlimitedDaily ? '∞ (1 в день)' : availableSessions}
          </p>
          <p>
            <strong>Использовано:</strong> {usedSessions}
          </p>
          {canSeeUpcomingBookings && (
            <p>
              <strong>Пред. запись:</strong> {upcomingBookingsCount}
            </p>
          )}
          {unpaidSessions > 0 && (
            <p className="membership-unpaid-notice">
              <strong>Неоплачено:</strong> {unpaidSessions}
            </p>
          )}
          {showPeriod && (
            <p>
              <strong>Период:</strong>{' '}
              {formatMembershipDate(startDate)} — {formatMembershipDate(endDate)}
            </p>
          )}
          {canFreezeType && (
            <p>
              <strong>Заморозка:</strong> осталось {remainingFreeze} из {FREEZE_BUDGET_DAYS}{' '}
              {pluralize(FREEZE_BUDGET_DAYS, 'день', 'дня', 'дней')}
            </p>
          )}
          {stopped && stoppedAt && (
            <p className="membership-frozen-notice">
              <strong>Остановлен с:</strong> {formatPostDate(stoppedAt)}
            </p>
          )}
          {frozen && frozenAt && (
            <p className="membership-frozen-notice">
              <strong>Заморожен с:</strong> {formatPostDate(frozenAt)}
              {plannedUntil ? ` до ${formatPostDate(plannedUntil)}` : ''}
            </p>
          )}
          {(() => {
            const periodItems = buildPeriodHistoryItems(periodLog, {
              type: membershipType,
              start: startDate,
              end: endDate
            }).reverse();
            if (!periodItems.length) return null;
            return (
              <CollapsibleHistorySection
                title="История абонементов:"
                items={periodItems.map((entry, index) => (
                  <li key={`period-${entry.type}-${entry.start}-${index}`} className="membership-history-row">
                    <span className="membership-history-row__text">{formatPeriodEntry(entry)}</span>
                  </li>
                ))}
              />
            );
          })()}
          {freezeLog.length > 0 && (
            <CollapsibleHistorySection
              title="История заморозок / остановок:"
              items={buildFreezeHistoryItemsNewestFirst(freezeLog).map(({ entry, isActive, key }) => (
                <li key={key} className="membership-history-row">
                  <span
                    className={
                      entry.kind === 'stop'
                        ? 'membership-history-dot membership-history-dot--stop'
                        : 'membership-history-dot membership-history-dot--freeze'
                    }
                    aria-hidden="true"
                  />
                  <span className="membership-history-row__text">
                    {formatFreezeLogEntry(entry, isActive)}
                  </span>
                </li>
              ))}
            />
          )}
          {user?.id && (
            <MembershipHistory
              enabled={Boolean(isOpen)}
              userId={user.id}
              refreshKey={ledgerRefreshKey}
              onOpenTraining={handleOpenTraining}
              onSettled={() => {
                void fetchMembership();
                onMutated?.();
              }}
            />
          )}
          {moderator && comment && (
            <p className="membership-comment-display">
              <strong>Комментарий:</strong> {comment}
            </p>
          )}
        </div>
      </Modal>

      <MembershipEditModal
        isOpen={Boolean(editMode)}
        onClose={() => setEditMode(null)}
        user={userSnapshot}
        mode="full"
        onMutated={handleMutated}
      />

      <TrainingDetailModal
        isOpen={Boolean(selectedTraining)}
        onClose={() => setSelectedTraining(null)}
        training={selectedTraining}
        currentUser={userSnapshot}
        onMutated={handleTrainingMutated}
      />
    </>
  );
}

export default MembershipModal;
