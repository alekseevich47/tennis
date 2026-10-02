// @ts-check
import pb from './pb';

const LEDGER_FIELDS = [
  'id',
  'created',
  'delta',
  'kind',
  'unpaid',
  'training_id',
  'training_date',
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
