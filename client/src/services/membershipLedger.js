// @ts-check
import pb from './pb';

const LEDGER_FIELDS = [
  'id',
  'created',
  'delta',
  'kind',
  'unpaid',
  'within_daily_limit',
  'training_id',
  'training_type',
  'training_date',
  'related_ledger_id',
  'actor_id',
  'actor_name'
].join(',');

const TRAINING_DEBT_FIELDS = `${LEDGER_FIELDS},user`;

const BOOKING_DEBT_KINDS = new Set(['booking', 'training_restored']);

/** related_ledger_id или суффикс ` #ledgerId` в actor_name (стенд без колонки related). */
export function relatedLedgerIdFromEntry(entry) {
  if (entry?.related_ledger_id) return String(entry.related_ledger_id);
  const name = String(entry?.actor_name || '');
  const m = name.match(/#([a-z0-9]{15})\s*$/i);
  return m ? m[1] : '';
}

/**
 * История списаний/пополнений посещений (сервер фильтрует по listRule: владелец | модератор).
 * @param {string} userId
 * @param {number} [page]
 * @param {number} [perPage]
 */
export async function fetchMembershipLedger(userId, page = 1, perPage = 20) {
  return pb.collection('membership_ledger').getList(page, perPage, {
    filter: pb.filter('user = {:uid}', { uid: userId }),
    sort: '-created,-id',
    fields: LEDGER_FIELDS,
    skipTotal: false,
    requestKey: null
  });
}

/**
 * Ledger-строки тренировки для кружков долга в ростере (booking / restore / settle).
 * @param {string} trainingId
 */
export async function fetchTrainingDebtLedgers(trainingId) {
  return pb.collection('membership_ledger').getFullList({
    filter: pb.filter(
      'training_id = {:tid} && (kind = "booking" || kind = "training_restored" || kind = "debt_settle")',
      { tid: trainingId }
    ),
    sort: '-created,-id',
    fields: TRAINING_DEBT_FIELDS,
    requestKey: null
  });
}

/**
 * Карта userId → статус долга по последней booking/restore-строке тренировки.
 * @param {any[]} items
 * @returns {Map<string, { ledgerId: string, debtPaid: boolean, readonly: boolean }>}
 */
export function buildTrainingDebtByUser(items) {
  /** @type {Map<string, { ledgerId: string, debtPaid: boolean, readonly: boolean }>} */
  const map = new Map();
  if (!Array.isArray(items) || items.length === 0) return map;

  const settledRelatedIds = new Set();
  const returnedUserIds = new Set();
  for (const entry of items) {
    if (entry.kind === 'debt_settle') {
      const related = relatedLedgerIdFromEntry(entry);
      if (related) settledRelatedIds.add(related);
    }
    if (entry.unpaid && Number(entry.delta) > 0 && entry.user) {
      returnedUserIds.add(String(entry.user));
    }
  }

  for (const entry of items) {
    if (!BOOKING_DEBT_KINDS.has(entry.kind) || !entry.user) continue;
    const userId = String(entry.user);
    if (map.has(userId)) continue;

    const isSettled = settledRelatedIds.has(String(entry.id));
    const isReturned =
      !entry.unpaid && !isSettled && returnedUserIds.has(userId);
    if (!(entry.unpaid || isSettled || isReturned)) continue;

    map.set(userId, {
      ledgerId: String(entry.id),
      debtPaid: !entry.unpaid && (isSettled || isReturned),
      readonly: isReturned
    });
  }

  return map;
}

/**
 * Списание / откат долга по строке ledger (только moderator).
 * @param {{ ledgerId: string, paid: boolean, userId?: string }} payload
 */
export async function settleMembershipDebt(payload) {
  return pb.send('/api/membership-ledger-settle-debt', {
    method: 'POST',
    body: payload
  });
}
