// Cron + API для lifecycle абонементов и шаблонов сообщений.

onBootstrap((e) => {
  // Как в notification_settings_bootstrap: сначала next, потом seed —
  // иначе save/require во время Bootstrap дают panic в goja.
  e.next();
  try {
    const tpl = require(__hooks + '/templatelib.js');
    tpl.ensureSystemTemplates($app);
  } catch (err) {
    console.log('[templates] seed: ' + err);
  }
});

// Каждые 15 минут: предупреждения / авто-разморозка / конвертация в one_time (окно с 08:00 GMT+7)
cronAdd('membership_lifecycle', '*/15 * * * *', () => {
  try {
    const lib = require(__hooks + '/membershiplib.js');
    lib.runMembershipLifecycle($app);
  } catch (err) {
    console.log('[membership_lifecycle] ' + err);
  }
});

routerAdd('POST', '/api/bot-notify-membership-frozen', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth || auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }
  const userId = (info.body || {}).userId;
  if (!userId) return c.json(400, { error: 'Missing userId' });
  try {
    const lib = require(__hooks + '/membershiplib.js');
    lib.notifyFreeze($app, userId);
  } catch (err) {
    console.log('[bot] membership frozen: ' + err);
  }
  return c.json(200, { ok: true });
});

routerAdd('POST', '/api/notify-membership-topup', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth || auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }
  const body = info.body || {};
  const userId = body.userId;
  const count = Number(body.count) || 0;
  if (!userId || count < 1) return c.json(400, { error: 'Missing userId/count' });
  try {
    const lib = require(__hooks + '/membershiplib.js');
    lib.notifyTopUp($app, userId, count);
  } catch (err) {
    console.log('[notify] membership topup: ' + err);
  }
  return c.json(200, { ok: true });
});

routerAdd('GET', '/api/system-templates', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth || auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }
  const channel = c.queryParam('channel') || 'bot';
  try {
    const tpl = require(__hooks + '/templatelib.js');
    tpl.ensureSystemTemplates($app);
    return c.json(200, { items: tpl.listByChannel($app, channel) });
  } catch (err) {
    return c.json(500, { error: String(err) });
  }
});

routerAdd('POST', '/api/system-templates-update', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth || auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }
  const body = info.body || {};
  const id = body.id;
  if (!id) return c.json(400, { error: 'Missing id' });
  try {
    const rec = $app.findRecordById('system_message_templates', id);
    if (body.title != null) rec.set('title', String(body.title));
    if (body.body != null) rec.set('body', String(body.body));
    if (body.action_label != null) rec.set('action_label', String(body.action_label));
    if (body.enabled != null) rec.set('enabled', !!body.enabled);
    $app.save(rec);
    return c.json(200, {
      id: rec.id,
      key: rec.getString('key'),
      channel: rec.getString('channel'),
      name: rec.getString('name'),
      description: rec.getString('description'),
      title: rec.getString('title'),
      body: rec.getString('body'),
      action_label: rec.getString('action_label'),
      enabled: rec.getBool('enabled') !== false
    });
  } catch (err) {
    return c.json(500, { error: String(err) });
  }
});
