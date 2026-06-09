// @ts-check
import useSWR from 'swr';
import { listOrders } from '../services/catalog';

/**
 * @param {{
 *   status?: 'pending' | 'completed' | 'cancelled',
 *   userId?: string,
 *   enabled?: boolean
 * }} [options]
 */
export function useOrders({ status, userId, enabled = true } = {}) {
  const key = enabled
    ? ['orders', status ?? null, userId ?? null]
    : null;

  return useSWR(
    key,
    ([, orderStatus, uid], { signal }) =>
      listOrders({
        status: orderStatus || undefined,
        userId: uid || undefined,
        signal
      })
  );
}
