import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { fetchMembershipLedger, settleMembershipDebt } from '../../services/membershipLedger';
import { isModerator } from '../../services/auth';
import { formatDateTimeShort, formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';

const PER_PAGE = 20;

const TRAINING_KIND_LABELS = {
  booking: 'Запись',
  unbook: 'Отмена записи',
  training_cancelled: 'Отмена тренировки',
  training_restored: 'Восстановление тренировки'
};

const BOOKING_DEBT_KINDS = new Set(['booking', 'training_restored']);

/**
 * @param {number} delta
 * @param {boolean} withinDailyLimit
 * @param {string} kind
 */
function formatAmount(delta, withinDailyLimit, kind) {
  if (withinDailyLimit) return 'Л';
  if (kind === 'debt_settle') return '';
  const abs = Math.abs(Number(delta) || 0);
  if (delta > 0) return `+${abs}`;
  if (delta < 0) return `−${abs}`;
  return '0';
}

/**
 * @param {string} [trainingType]
 * @param {string} [trainingDate]
 */
function trainingLabel(trainingType, trainingDate) {
  const typeWord = trainingType === 'tournament' ? 'турнир' : 'тренировка';
  if (trainingDate) {
    return `${typeWord} ${formatDateTimeShort(trainingDate)}`;
  }
  return typeWord;
}

/**
 * @param {{
 *   entry: any,
 *   ownerId: string,
 *   onOpenTraining: (trainingId: string) => void
 * }} props
 */
function LedgerDescription({ entry, ownerId, onOpenTraining }) {
  const isPlus = Number(entry.delta) > 0;
  const actorName = entry.actor_name || 'Модератор';
  const byOther = Boolean(entry.actor_id) && entry.actor_id !== ownerId;
  const unpaidNote = entry.unpaid ? (isPlus ? ' (долг снят)' : ' (в долг)') : '';

  if (entry.kind === 'manual_add') {
    return <>Добавил: {actorName}</>;
  }
  if (entry.kind === 'manual_subtract') {
    return <>Списал: {actorName}</>;
  }
  if (entry.kind === 'expired') {
    return <>Окончание срока абонемента</>;
  }
  if (entry.kind === 'debt_settle') {
    return (
      <>
        Списание долга: {trainingLabel(entry.training_type, entry.training_date)}
        {actorName ? ` (${actorName})` : ''}
      </>
    );
  }

  const kindLabel = TRAINING_KIND_LABELS[entry.kind] || 'Тренировка';
  const actorVerb = entry.unpaid && !isPlus ? 'записал' : isPlus ? 'вернул' : 'списал';

  return (
    <>
      {kindLabel}
      {entry.training_id ? (
        <>
          {': '}
          <button
            type="button"
            className="membership-ledger-link"
            onClick={() => onOpenTraining(entry.training_id)}
          >
            {trainingLabel(entry.training_type, entry.training_date)}
          </button>
        </>
      ) : null}
      {unpaidNote}
      {byOther && (
        <span className="membership-ledger-actor">
          {' · '}
          {actorVerb}: {actorName}
        </span>
      )}
    </>
  );
}

/**
 * История списаний/пополнений посещений абонемента.
 *
 * @param {{
 *   enabled: boolean,
 *   userId: string,
 *   refreshKey: number,
 *   onOpenTraining: (trainingId: string) => void,
 *   onSettled?: () => void
 * }} props
 */
function MembershipHistory({ enabled, userId, refreshKey, onOpenTraining, onSettled }) {
  const [items, setItems] = useState(/** @type {any[]} */ ([]));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(/** @type {string | null} */ (null));
  const requestIdRef = useRef(0);
  const moderator = isModerator();

  const load = useCallback(
    async (nextPage) => {
      if (!userId) return;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await fetchMembershipLedger(userId, nextPage, PER_PAGE);
        if (requestId !== requestIdRef.current) return;
        setItems((prev) => (nextPage === 1 ? res.items : [...prev, ...res.items]));
        setPage(nextPage);
        setTotalPages(res.totalPages);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        error('fetch membership ledger:', err);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    requestIdRef.current += 1;
    setItems([]);
    setPage(1);
    setTotalPages(0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    void load(1);
  }, [enabled, load, refreshKey]);

  const settledRelatedIds = useMemo(() => {
    const set = new Set();
    for (const entry of items) {
      if (entry.kind === 'debt_settle' && entry.related_ledger_id) {
        set.add(String(entry.related_ledger_id));
      }
    }
    return set;
  }, [items]);

  const handleDebtToggle = useCallback(
    async (entry, paid) => {
      if (!moderator || !entry?.id || busyId) return;
      setBusyId(entry.id);
      try {
        await settleMembershipDebt({ ledgerId: entry.id, paid, userId });
        await load(1);
        onSettled?.();
      } catch (err) {
        error('settle membership debt:', err);
      } finally {
        setBusyId(null);
      }
    },
    [moderator, busyId, userId, load, onSettled]
  );

  if (!items.length && !loading) return null;

  const firstLoad = loading && !items.length;
  const hasMore = page < totalPages;

  return (
    <div className="membership-ledger">
      <p>
        <strong>История посещений:</strong>
      </p>
      {firstLoad ? (
        <ul className="membership-ledger-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="membership-ledger-skeleton" />
          ))}
        </ul>
      ) : (
        <ul className="membership-ledger-list">
          {items.map((entry, index) => {
            const delta = Number(entry.delta) || 0;
            const withinDailyLimit = Boolean(entry.within_daily_limit);
            const isPlusKind =
              entry.kind === 'unbook' ||
              entry.kind === 'training_cancelled' ||
              entry.kind === 'manual_add' ||
              delta > 0;
            const amountClass = isPlusKind
              ? 'membership-ledger-amount--plus'
              : 'membership-ledger-amount--minus';

            const showDebtDot =
              BOOKING_DEBT_KINDS.has(entry.kind) &&
              (entry.unpaid || settledRelatedIds.has(String(entry.id)));
            const debtPaid = !entry.unpaid && settledRelatedIds.has(String(entry.id));

            return (
              <li
                key={entry.id}
                className="membership-ledger-item"
                style={{ '--i': index % PER_PAGE }}
              >
                {showDebtDot && (
                  <button
                    type="button"
                    className={clsx(
                      'membership-ledger-debt-dot',
                      debtPaid
                        ? 'membership-ledger-debt-dot--paid'
                        : 'membership-ledger-debt-dot--unpaid',
                      !moderator && 'membership-ledger-debt-dot--readonly'
                    )}
                    aria-label={debtPaid ? 'Отменить списание долга' : 'Списать долг'}
                    disabled={!moderator || busyId === entry.id}
                    tabIndex={moderator ? 0 : -1}
                    onClick={() => {
                      if (!moderator) return;
                      void handleDebtToggle(entry, !debtPaid);
                    }}
                  />
                )}
                <span className="membership-ledger-time">{formatPostDate(entry.created)}</span>
                <span className={clsx('membership-ledger-amount', amountClass)}>
                  {formatAmount(delta, withinDailyLimit, entry.kind)}
                </span>
                <span className="membership-ledger-desc">
                  <LedgerDescription
                    entry={entry}
                    ownerId={userId}
                    onOpenTraining={onOpenTraining}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {hasMore && (
        <button
          type="button"
          className="membership-ledger-more"
          onClick={() => void load(page + 1)}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Показать ещё'}
        </button>
      )}
    </div>
  );
}

export default MembershipHistory;
