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

// Колбэк после admin_backup_runner.sh (one-shot токен из /opt/tennis/backups/manual/).
routerAdd('POST', '/api/internal/backup-notify', (c) => {
  const backuplib = require(__hooks + '/backuplib.js');
  const body = c.requestInfo().body || {};
  const type = body.type;
  const ok = body.ok === true || body.ok === 'true';
  if (type !== 'db' && type !== 'media') {
    return c.json(400, { error: 'type must be "db" or "media"' });
  }

  let got = '';
  try {
    got = c.request.header.get('X-Backup-Notify-Token') || '';
  } catch (_) {}
  if (!got) {
    try {
      const headers = c.requestInfo().headers || {};
      got = headers['x_backup_notify_token'] || '';
    } catch (_) {}
  }

  if (!backuplib.consumeNotifyToken(type, got)) {
    console.log('[backup] notify rejected: bad/missing one-shot token type=' + type);
    return c.json(403, { error: 'Forbidden' });
  }

  try {
    const result = backuplib.notifyModeratorsBackupResult($app, type, ok);
    return c.json(200, result);
  } catch (err) {
    const message = (err && err.message) || String(err);
    console.log('[backup] notify api: ' + message);
    return c.json(500, { error: message });
  }
});

console.log('--- BACKUP API LOADED ---');
