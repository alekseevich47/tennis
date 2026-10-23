import pb from './pb';

/**
 * @param {string} [userId] — для модератора; иначе self
 * @returns {Promise<object>}
 */
export async function freezeMembership(userId) {
  const body = { action: 'freeze' };
  if (userId) body.userId = userId;
  return pb.send('/api/membership-freeze', { method: 'POST', body });
}

/**
 * @param {string} [userId]
 * @returns {Promise<object>}
 */
export async function unfreezeMembership(userId) {
  const body = { action: 'unfreeze' };
  if (userId) body.userId = userId;
  return pb.send('/api/membership-freeze', { method: 'POST', body });
}

/**
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function stopMembership(userId) {
  return pb.send('/api/membership-stop', {
    method: 'POST',
    body: { userId, action: 'stop' }
  });
}

/**
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function startMembership(userId) {
  return pb.send('/api/membership-stop', {
    method: 'POST',
    body: { userId, action: 'start' }
  });
}
