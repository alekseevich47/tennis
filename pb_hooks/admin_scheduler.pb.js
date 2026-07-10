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
        var rid = '';
        try { rid = broadcasts[i].id; } catch (_) {}
        console.log('[admin] cron broadcast ' + rid + ': ' + (err && err.stack ? err.stack : err));
      }
    }

    const notifications = $app.findRecordsByFilter('scheduled_notifications', filter, 'scheduled_at', 0, 0);
    for (let j = 0; j < notifications.length; j++) {
      try {
        adminlib.dispatchScheduledNotification(notifications[j]);
      } catch (err) {
        var nid = '';
        try { nid = notifications[j].id; } catch (_) {}
        console.log('[admin] cron notification ' + nid + ': ' + (err && err.stack ? err.stack : err));
      }
    }
  } catch (err) {
    console.log('[admin] dispatch cron: ' + (err && err.stack ? err.stack : err));
  }
});

routerAdd('POST', '/api/admin-dispatch-now', (c) => {
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

  // Не отправляем синхронно — крон dispatch_scheduled_items подхватит запись
  // (scheduled_at уже = now) в течение ближайшей минуты.
  return c.json(200, { success: true, accepted: true });
});

console.log('--- ADMIN SCHEDULER LOADED ---');
