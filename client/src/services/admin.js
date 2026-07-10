// @ts-check
import pb from './pb';
import { error } from '../lib/log';
import { auditAdmin } from '../lib/audit';

/**
 * @param {string} collection
 * @param {string} id
 */
async function dispatchNow(collection, id) {
  try {
    return await pb.send('/api/admin-dispatch-now', {
      method: 'POST',
      body: { collection, id }
    });
  } catch (err) {
    error('admin dispatch-now:', err);
    throw err;
  }
}

/**
 * @param {string} [isoString]
 */
function toDatetimeLocalValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * @param {string} value
 */
function fromDatetimeLocalValue(value) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

export { toDatetimeLocalValue, fromDatetimeLocalValue };

/**
 * @param {{
 *   text: string,
 *   audience: string,
 *   recipients?: string[],
 *   sendNow?: boolean,
 *   scheduledAt?: string,
 *   files?: File[],
 *   mediaToDelete?: string[],
 *   isUpdate?: boolean
 * }} options
 * @returns {FormData | Record<string, unknown>}
 */
function buildBroadcastRecordPayload({
  text,
  audience,
  recipients = [],
  sendNow = false,
  scheduledAt,
  files = [],
  mediaToDelete = [],
  isUpdate = false
}) {
  const scheduled_at = sendNow ? new Date().toISOString() : fromDatetimeLocalValue(scheduledAt || '');
  const recipientsValue = audience === 'selected' ? recipients : [];
  const hasFileOps = files.length > 0 || (isUpdate && mediaToDelete.length > 0);

  if (!hasFileOps) {
    const payload = {
      text,
      audience,
      recipients: recipientsValue,
      scheduled_at
    };
    if (!isUpdate) {
      payload.status = 'pending';
    }
    return payload;
  }

  const formData = new FormData();
  formData.append('text', text);
  formData.append('audience', audience);
  recipientsValue.forEach((recipientId) => formData.append('recipients', recipientId));
  formData.append('scheduled_at', scheduled_at);
  if (!isUpdate) {
    formData.append('status', 'pending');
  }
  mediaToDelete.forEach((filename) => formData.append('media-', filename));
  const mediaFieldName = isUpdate ? 'media+' : 'media';
  files.forEach((file) => formData.append(mediaFieldName, file));
  return formData;
}

/**
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @param {string[]} keys
 * @returns {string[]}
 */
function getChangedKeys(before, after, keys) {
  return keys.filter((key) => {
    const from = before[key];
    const to = after[key];
    if (Array.isArray(from) && Array.isArray(to)) {
      return JSON.stringify(from) !== JSON.stringify(to);
    }
    return from !== to;
  });
}

/**
 * @param {string} isoString
 */
function toScheduledAtMinute(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
}

/**
 * @param {{
 *   text: string,
 *   audience: string,
 *   recipients?: string[],
 *   sendNow?: boolean,
 *   scheduledAt?: string,
 *   files?: File[],
 *   mediaToDelete?: string[]
 * }} payload
 */
function getBroadcastChangedFields(existing, payload) {
  const { text, audience, recipients = [], sendNow = false, scheduledAt, files = [], mediaToDelete = [] } =
    payload;
  const next = {
    text,
    audience,
    recipients: audience === 'selected' ? recipients : [],
    scheduled_at: sendNow ? new Date().toISOString() : fromDatetimeLocalValue(scheduledAt || '')
  };
  const changedFields = getChangedKeys(existing, next, ['text', 'audience', 'recipients']);
  if (toScheduledAtMinute(existing.scheduled_at) !== toScheduledAtMinute(next.scheduled_at)) {
    changedFields.push('scheduled_at');
  }
  if (files.length > 0 || mediaToDelete.length > 0) {
    changedFields.push('media');
  }
  return changedFields;
}

/**
 * @param {{
 *   title: string,
 *   body: string,
 *   audience: string,
 *   recipients?: string[],
 *   sendNow?: boolean,
 *   scheduledAt?: string
 * }} payload
 */
function getNotificationChangedFields(existing, payload) {
  const { title, body, audience, recipients = [], sendNow = false, scheduledAt } = payload;
  const next = {
    title,
    body,
    audience,
    recipients: audience === 'selected' ? recipients : [],
    scheduled_at: sendNow ? new Date().toISOString() : fromDatetimeLocalValue(scheduledAt || '')
  };
  const changedFields = getChangedKeys(existing, next, ['title', 'body', 'audience', 'recipients']);
  if (toScheduledAtMinute(existing.scheduled_at) !== toScheduledAtMinute(next.scheduled_at)) {
    changedFields.push('scheduled_at');
  }
  return changedFields;
}

export async function listScheduledBroadcasts() {
  return pb.collection('scheduled_broadcasts').getFullList({
    filter: "status = 'pending'",
    sort: 'scheduled_at'
  });
}

/**
 * @param {{ text: string, audience: string, recipients?: string[], sendNow?: boolean, scheduledAt?: string, files?: File[], mediaToDelete?: string[] }} payload
 */
/**
 * Создание/обновление записи в `scheduled_*` — самостоятельная операция: если она
 * прошла успешно, запись гарантированно сохранена в БД, даже если последующая
 * немедленная отправка («Сейчас») упадёт по сети/на сервере. Раньше ошибка на шаге
 * отправки трактовалась как «не удалось сохранить», хотя запись (и часть уведомлений
 * получателям) уже была создана — отсюда путаница «ошибка в форме, но уведомление
 * в колокольчике появилось».
 * @returns {Promise<{ record: any, sendNow: boolean, dispatched: boolean, dispatchFailed: boolean, accepted?: boolean }>}
 */
export async function createScheduledBroadcast({
  text,
  audience,
  recipients = [],
  sendNow = false,
  scheduledAt,
  files = [],
  mediaToDelete = []
}) {
  const record = await pb.collection('scheduled_broadcasts').create(
    buildBroadcastRecordPayload({
      text,
      audience,
      recipients,
      sendNow,
      scheduledAt,
      files,
      mediaToDelete,
      isUpdate: false
    })
  );
  auditAdmin.broadcastCreate(record, sendNow);

  if (!sendNow) {
    return { record, sendNow: false, dispatched: false, dispatchFailed: false };
  }

  try {
    const result = await dispatchNow('scheduled_broadcasts', record.id);
    const accepted = result?.accepted === true || result?.skipped === true;
    return {
      record,
      sendNow: true,
      dispatched: accepted,
      dispatchFailed: !accepted,
      accepted
    };
  } catch (err) {
    error('dispatch scheduled broadcast now:', err);
    return { record, sendNow: true, dispatched: false, dispatchFailed: true };
  }
}

/**
 * @param {string} id
 * @param {{ text: string, audience: string, recipients?: string[], sendNow?: boolean, scheduledAt?: string, files?: File[], mediaToDelete?: string[] }} payload
 */
export async function updateScheduledBroadcast(id, payload) {
  const existing = await pb.collection('scheduled_broadcasts').getOne(id);
  const {
    text,
    audience,
    recipients = [],
    sendNow = false,
    scheduledAt,
    files = [],
    mediaToDelete = []
  } = payload;
  const changedFields = getBroadcastChangedFields(existing, payload);
  const record = await pb.collection('scheduled_broadcasts').update(
    id,
    buildBroadcastRecordPayload({
      text,
      audience,
      recipients,
      sendNow,
      scheduledAt,
      files,
      mediaToDelete,
      isUpdate: true
    })
  );
  if (changedFields.length > 0) {
    auditAdmin.broadcastEdit(id, changedFields);
  }

  if (!sendNow) {
    return { record, sendNow: false, dispatched: false, dispatchFailed: false };
  }

  try {
    const result = await dispatchNow('scheduled_broadcasts', record.id);
    const accepted = result?.accepted === true || result?.skipped === true;
    return {
      record,
      sendNow: true,
      dispatched: accepted,
      dispatchFailed: !accepted,
      accepted
    };
  } catch (err) {
    error('dispatch scheduled broadcast now:', err);
    return { record, sendNow: true, dispatched: false, dispatchFailed: true };
  }
}

/**
 * @param {string} id
 */
export async function cancelScheduledBroadcast(id) {
  const record = await pb.collection('scheduled_broadcasts').update(id, { status: 'cancelled' });
  auditAdmin.broadcastCancel(id);
  return record;
}

export async function listScheduledNotifications() {
  return pb.collection('scheduled_notifications').getFullList({
    filter: "status = 'pending'",
    sort: 'scheduled_at'
  });
}

/**
 * @param {{ title: string, body: string, audience: string, recipients?: string[], sendNow?: boolean, scheduledAt?: string }} payload
 */
/**
 * @returns {Promise<{ record: any, sendNow: boolean, dispatched: boolean, dispatchFailed: boolean, accepted?: boolean }>}
 */
export async function createScheduledNotification({
  title,
  body,
  audience,
  recipients = [],
  sendNow = false,
  scheduledAt
}) {
  const record = await pb.collection('scheduled_notifications').create({
    title,
    body,
    audience,
    recipients: audience === 'selected' ? recipients : [],
    scheduled_at: sendNow ? new Date().toISOString() : fromDatetimeLocalValue(scheduledAt || ''),
    status: 'pending'
  });
  auditAdmin.notificationCreate(record, sendNow);

  if (!sendNow) {
    return { record, sendNow: false, dispatched: false, dispatchFailed: false };
  }

  try {
    const result = await dispatchNow('scheduled_notifications', record.id);
    const accepted = result?.accepted === true || result?.skipped === true;
    return {
      record,
      sendNow: true,
      dispatched: accepted,
      dispatchFailed: !accepted,
      accepted
    };
  } catch (err) {
    error('dispatch scheduled notification now:', err);
    return { record, sendNow: true, dispatched: false, dispatchFailed: true };
  }
}

/**
 * @param {string} id
 * @param {{ title: string, body: string, audience: string, recipients?: string[], sendNow?: boolean, scheduledAt?: string }} payload
 */
export async function updateScheduledNotification(id, payload) {
  const existing = await pb.collection('scheduled_notifications').getOne(id);
  const { title, body, audience, recipients = [], sendNow = false, scheduledAt } = payload;
  const changedFields = getNotificationChangedFields(existing, payload);
  const record = await pb.collection('scheduled_notifications').update(id, {
    title,
    body,
    audience,
    recipients: audience === 'selected' ? recipients : [],
    scheduled_at: sendNow ? new Date().toISOString() : fromDatetimeLocalValue(scheduledAt || '')
  });
  if (changedFields.length > 0) {
    auditAdmin.notificationEdit(id, changedFields);
  }

  if (!sendNow) {
    return { record, sendNow: false, dispatched: false, dispatchFailed: false };
  }

  try {
    const result = await dispatchNow('scheduled_notifications', record.id);
    const accepted = result?.accepted === true || result?.skipped === true;
    return {
      record,
      sendNow: true,
      dispatched: accepted,
      dispatchFailed: !accepted,
      accepted
    };
  } catch (err) {
    error('dispatch scheduled notification now:', err);
    return { record, sendNow: true, dispatched: false, dispatchFailed: true };
  }
}

/**
 * @param {string} id
 */
export async function cancelScheduledNotification(id) {
  const record = await pb.collection('scheduled_notifications').update(id, { status: 'cancelled' });
  auditAdmin.notificationCancel(id);
  return record;
}

export async function getNotificationSettings() {
  const records = await pb.collection('notification_settings').getFullList();
  return records[0] || null;
}

/**
 * @param {string} id
 * @param {Record<string, boolean>} patch
 */
export async function updateNotificationSettings(id, patch) {
  const record = await pb.collection('notification_settings').update(id, patch);
  const [field, value] = Object.entries(patch)[0];
  auditAdmin.settingToggled(field, value);
  return record;
}

export const MODERATOR_LOG_DOMAINS = [
  'ТРЕНИРОВКИ',
  'АБОНЕМЕНТ',
  'ПРОФИЛЬ',
  'РЕЙТИНГ',
  'АДМИНИСТРИРОВАНИЕ'
];

export const PROFILE_EXCLUDED_ACTIONS = ['Аватар обновлён'];

/**
 * @param {{ start: string, end: string }} params
 */
function addDaysToDateInput(value, days) {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function listModeratorLogs({ start, end }) {
  const domainParams = Object.fromEntries(
    MODERATOR_LOG_DOMAINS.map((domain, i) => [`d${i}`, domain])
  );
  const domainFilter = MODERATOR_LOG_DOMAINS.map((_, i) => `domain = {:d${i}}`).join(' || ');
  const endExclusive = addDaysToDateInput(end, 1);

  const results = await pb.collection('audit_logs').getFullList({
    filter: pb.filter(
      `is_error = false && created >= {:start} && created < {:endExclusive} && (${domainFilter})`,
      { start, endExclusive, ...domainParams }
    ),
    sort: '-created'
  });

  return results.filter(
    (r) => !(r.domain === 'ПРОФИЛЬ' && PROFILE_EXCLUDED_ACTIONS.includes(r.action))
  );
}
