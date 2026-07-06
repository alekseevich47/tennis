// Крон диспетчера запланированных рассылок/уведомлений + немедленная отправка («Сейчас»).

cronAdd('dispatch_scheduled_items', '* * * * *', () => {
  const adminlib = require(__hooks + '/adminlib.js');
  try {
    const filter = 'status = "pending" && scheduled_at <= @now';

    const broadcasts = $app.findRecordsByFilter('scheduled_broadcasts', filter, 'scheduled_at', 0, 0);
    for (let i = 0; i < broadcasts.length; i++) {
      try {
        adminlib.dispatchScheduledBroadcast(broadcasts[i]);
      } catch (err) {
        console.log('[admin] cron broadcast ' + broadcasts[i].getId() + ': ' + err);
      }
    }

    const notifications = $app.findRecordsByFilter('scheduled_notifications', filter, 'scheduled_at', 0, 0);
    for (let j = 0; j < notifications.length; j++) {
      try {
        adminlib.dispatchScheduledNotification(notifications[j]);
      } catch (err) {
        console.log('[admin] cron notification ' + notifications[j].getId() + ': ' + err);
      }
    }
  } catch (err) {
    console.log('[admin] dispatch cron: ' + err);
  }
});

routerAdd('POST', '/api/admin-dispatch-now', (c) => {
  const adminlib = require(__hooks + '/adminlib.js');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const collection = body.collection;
  const id = body.id;
  if (!collection || !id) {
    return c.json(400, { error: 'Missing required fields' });
  }
  if (collection !== 'scheduled_broadcasts' && collection !== 'scheduled_notifications') {
    return c.json(400, { error: 'Invalid collection' });
  }

  let record;
  try {
    record = $app.findRecordById(collection, id);
  } catch (_) {
    return c.json(404, { error: 'Record not found' });
  }

  if (record.getString('status') !== 'pending') {
    return c.json(200, { success: true, skipped: true });
  }

  try {
    if (collection === 'scheduled_broadcasts') {
      adminlib.dispatchScheduledBroadcast(record);
    } else {
      adminlib.dispatchScheduledNotification(record);
    }
  } catch (err) {
    console.log('[admin] dispatch-now ' + id + ': ' + err);
    return c.json(500, { error: 'Dispatch failed' });
  }

  return c.json(200, { success: true });
});

console.log('--- ADMIN SCHEDULER LOADED ---');
