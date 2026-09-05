// Ручной запуск бэкапа DB / MEDIA из админ-панели (модератор).

routerAdd('POST', '/api/admin-backup', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const type = body.type;
  if (type !== 'db' && type !== 'media') {
    return c.json(400, { error: 'type must be "db" or "media"' });
  }

  const backuplib = require(__hooks + '/backuplib.js');
  try {
    const result = backuplib.startBackup(type);
    return c.json(200, result);
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    const message = (err && err.message) || String(err);
    console.log('[backup] api: ' + message);
    return c.json(status >= 400 && status < 600 ? status : 500, { error: message });
  }
});

console.log('--- BACKUP API LOADED ---');
