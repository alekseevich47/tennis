// API заморозки / остановки абонемента (только через сервер, не PATCH users).

function loadTargetUser(userId) {
  try {
    return $app.findRecordById('users', userId);
  } catch (_) {
    return null;
  }
}

routerAdd('POST', '/api/membership-freeze', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }

  const body = info.body || {};
  const action = String(body.action || '');
  const isMod = auth.getString('role') === 'moderator';
  let targetUserId = body.userId || auth.id;
  if (!isMod) {
    targetUserId = auth.id;
  }
  if (!targetUserId) {
    return c.json(400, { error: 'Missing userId' });
  }
  if (action !== 'freeze' && action !== 'unfreeze') {
    return c.json(400, { error: 'Invalid action' });
  }

  const target = loadTargetUser(targetUserId);
  if (!target) {
    return c.json(404, { error: 'User not found' });
  }

  try {
    const lib = require(__hooks + '/membershiplib.js');
    let snapshot;
    if (action === 'freeze') {
      snapshot = lib.freezeUser($app, { target: target, actor: auth });
    } else {
      snapshot = lib.unfreezeUser($app, { target: target, actor: auth, reason: 'manual' });
    }
    return c.json(200, { ok: true, user: snapshot });
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    const message = (err && err.message) || String(err);
    console.log('[membership-freeze] ' + message);
    return c.json(status >= 400 && status < 600 ? status : 400, { error: message });
  }
});

routerAdd('POST', '/api/membership-stop', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const action = String(body.action || '');
  const targetUserId = body.userId;
  if (!targetUserId) {
    return c.json(400, { error: 'Missing userId' });
  }
  if (action !== 'stop' && action !== 'start') {
    return c.json(400, { error: 'Invalid action' });
  }

  const target = loadTargetUser(targetUserId);
  if (!target) {
    return c.json(404, { error: 'User not found' });
  }

  try {
    const lib = require(__hooks + '/membershiplib.js');
    let snapshot;
    if (action === 'stop') {
      snapshot = lib.stopUser($app, { target: target, actor: auth });
    } else {
      snapshot = lib.startUser($app, { target: target, actor: auth });
    }
    return c.json(200, { ok: true, user: snapshot });
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    const message = (err && err.message) || String(err);
    console.log('[membership-stop] ' + message);
    return c.json(status >= 400 && status < 600 ? status : 400, { error: message });
  }
});

console.log('--- MEMBERSHIP FREEZE/STOP LOADED ---');
