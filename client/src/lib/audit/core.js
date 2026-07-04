// @ts-check
import { IS_DEV } from '../../config';
import pb from '../../services/pb';
import { error as logError } from '../log';

const ANONYMOUS_ACTOR = {
  userId: 'anonymous',
  userFullName: 'Аноним',
  role: 'ПОЛЬЗОВАТЕЛЬ'
};

/**
 * @typedef {'МОДЕРАТОР' | 'ПОЛЬЗОВАТЕЛЬ'} AuditRole
 *
 * @typedef {Object} AuditActor
 * @property {string} userId
 * @property {string} userFullName
 * @property {AuditRole} role
 */

/**
 * @returns {AuditActor}
 */
export function getActor() {
  const user = /** @type {{ id?: string, full_name?: string, name?: string, role?: string, email?: string } | null} */ (
    pb.authStore.model
  );

  if (!user) return ANONYMOUS_ACTOR;

  const isModerator = user.role === 'moderator' || user.email === 'admin@example.com';

  return {
    userId: user.id || ANONYMOUS_ACTOR.userId,
    userFullName: user.full_name || 'Пользователь',
    role: isModerator ? 'МОДЕРАТОР' : 'ПОЛЬЗОВАТЕЛЬ'
  };
}

/**
 * @param {string} domain
 * @param {string} action
 * @param {Record<string, unknown>} details
 * @param {boolean} isError
 */
function createAuditLog(domain, action, details, isError) {
  const actor = getActor();
  const payload = {
    user: actor.userId === ANONYMOUS_ACTOR.userId ? null : actor.userId,
    actor_name: actor.userFullName,
    actor_role: actor.role,
    domain,
    action,
    details: {
      ...details,
      ts: new Date().toISOString()
    },
    is_error: isError
  };

  pb.collection('audit_logs')
    .create(payload)
    .catch((err) => {
      console.warn('Ошибка записи audit_logs:', err);
    });
}

/**
 * @param {string} domain
 * @param {string} action
 * @param {Record<string, unknown>} [details]
 */
export function writeAudit(domain, action, details = {}) {
  const actor = getActor();

  if (IS_DEV) {
    console.log(`[АУДИТ][${domain}][${actor.role}] ${action}`, details);
  }

  createAuditLog(domain, action, details, false);
}

/**
 * @param {string} domain
 * @param {string} action
 * @param {unknown} err
 * @param {Record<string, unknown>} [details]
 */
export function writeAuditError(domain, action, err, details = {}) {
  const actor = getActor();
  const errorMessage = err instanceof Error ? err.message : String(err || '');
  const errorDetails = {
    ...details,
    errorMessage
  };

  logError(`[АУДИТ][${domain}][${actor.role}] ${action}`, err, errorDetails);
  createAuditLog(domain, action, errorDetails, true);
}
