import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { fetchMembershipLedger } from '../../services/membershipLedger';
import { formatDateTimeShort, formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';

const PER_PAGE = 20;

const TRAINING_KIND_LABELS = {
  booking: 'Запись',
  unbook: 'Отмена записи',
  training_cancelled: 'Отмена тренировки',
  training_restored: 'Восстановление тренировки'
};

/**
 * @param {number} delta
 */
function formatAmount(delta) {
  const abs = Math.abs(Number(delta) || 0);
  if (delta > 0) return `+${abs}`;
  if (delta < 0) return `−${abs}`;
  return '0';
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

  const kindLabel = TRAINING_KIND_LABELS[entry.kind] || 'Тренировка';
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
            {entry.training_date
              ? `тренировка ${formatDateTimeShort(entry.training_date)}`
              : 'тренировка'}
          </button>
        </>
      ) : null}
      {unpaidNote}
      {byOther && (
        <span className="membership-ledger-actor">
          {' · '}
          {isPlus ? 'вернул' : 'списал'}: {actorName}
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
 *   onOpenTraining: (trainingId: string) => void
 * }} props
 */
function MembershipHistory({ enabled, userId, refreshKey, onOpenTraining }) {
  const [items, setItems] = useState(/** @type {any[]} */ ([]));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

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

  if (!items.length && !loading) return null;

  const firstLoad = loading && !items.length;
  const hasMore = page < totalPages;

  return (
    <div className="membership-ledger">
      <p><strong>История посещений:</strong></p>
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
            return (
              <li
                key={entry.id}
                className="membership-ledger-item"
                style={{ '--i': index % PER_PAGE }}
              >
                <span className="membership-ledger-time">{formatPostDate(entry.created)}</span>
                <span
                  className={clsx(
                    'membership-ledger-amount',
                    delta > 0 ? 'membership-ledger-amount--plus' : 'membership-ledger-amount--minus'
                  )}
                >
                  {formatAmount(delta)}
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
