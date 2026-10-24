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
 * Списание / откат долга по строке ledger (только moderator).
 * @param {{ ledgerId: string, paid: boolean, userId?: string }} payload
 */
export async function settleMembershipDebt(payload) {
  return pb.send('/api/membership-ledger-settle-debt', {
    method: 'POST',
    body: payload
  });
}
