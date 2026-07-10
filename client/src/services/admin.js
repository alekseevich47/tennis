// @ts-check
import pb from './pb';
import { error } from '../lib/log';

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
  const {
    text,
    audience,
    recipients = [],
    sendNow = false,
    scheduledAt,
    files = [],
    mediaToDelete = []
  } = payload;
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
  return pb.collection('scheduled_broadcasts').update(id, { status: 'cancelled' });
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
  const { title, body, audience, recipients = [], sendNow = false, scheduledAt } = payload;
  const record = await pb.collection('scheduled_notifications').update(id, {
    title,
    body,
    audience,
    recipients: audience === 'selected' ? recipients : [],
    scheduled_at: sendNow ? new Date().toISOString() : fromDatetimeLocalValue(scheduledAt || '')
  });
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
  return pb.collection('scheduled_notifications').update(id, { status: 'cancelled' });
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
  return pb.collection('notification_settings').update(id, patch);
}
