// @ts-check
import pb from './pb';
import { error } from '../lib/log';

/**
 * @param {string} userId
 * @param {number} count
 */
export async function notifyMembershipTopUp(userId, count) {
  if (!userId || !(count > 0)) return;
  try {
    await pb.send('/api/notify-membership-topup', {
      method: 'POST',
      body: { userId, count }
    });
  } catch (err) {
    error('notifyMembershipTopUp:', err);
  }
}
