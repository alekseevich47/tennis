// API заморозки / остановки абонемента (только через сервер, не PATCH users).

function loadTargetUser(userId) {
  try {
    return $app.findRecordById('users', userId);
  } catch (_) {
    return null;
  }
}

function errMessage(err) {
  try {
    if (err && err.message) return String(err.message);
  } catch (_) {}
  try {
    return String(err);
  } catch (_) {
    return 'Unknown error';
  }
}

function errStatus(err) {
  try {
    var s = err && err.status;
    if (s >= 400 && s < 600) return s;
  } catch (_) {}
  return 400;
}

function apiError(c, status, message) {
  console.log('[membership-api] ' + status + ' ' + message);
  return c.json(status, { status: status, message: message, data: {} });
}

routerAdd('POST', '/api/membership-freeze', (c) => {
  console.log('[membership-freeze] hit');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return apiError(c, 401, 'Unauthorized');
  }

  const body = info.body || {};
  const action = String(body.action || '');
  const isMod = auth.getString('role') === 'moderator';
  let targetUserId = body.userId || auth.id;
  if (!isMod) {
    targetUserId = auth.id;
  }
  if (!targetUserId) {
    return apiError(c, 400, 'Missing userId');
  }
  if (action !== 'freeze' && action !== 'unfreeze') {
    return apiError(c, 400, 'Invalid action');
  }

  const target = loadTargetUser(targetUserId);
  if (!target) {
    return apiError(c, 404, 'User not found');
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
    const message = errMessage(err);
    console.log('[membership-freeze] ' + message);
    return apiError(c, errStatus(err), message);
  }
});

routerAdd('POST', '/api/membership-stop', (c) => {
  console.log('[membership-stop] hit');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return apiError(c, 401, 'Unauthorized');
  }
  if (auth.getString('role') !== 'moderator') {
    return apiError(c, 403, 'Forbidden');
  }

  const body = info.body || {};
  const action = String(body.action || '');
  const targetUserId = body.userId;
  if (!targetUserId) {
    return apiError(c, 400, 'Missing userId');
  }
  if (action !== 'stop' && action !== 'start') {
    return apiError(c, 400, 'Invalid action');
  }

  const target = loadTargetUser(targetUserId);
  if (!target) {
    return apiError(c, 404, 'User not found');
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
    const message = errMessage(err);
    console.log('[membership-stop] ' + message);
    return apiError(c, errStatus(err), message);
  }
});

console.log('--- MEMBERSHIP FREEZE/STOP LOADED ---');
