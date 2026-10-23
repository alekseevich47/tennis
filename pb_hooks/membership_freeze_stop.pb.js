// API заморозки / остановки абонемента.
// Без findRecordById('users') — на стенде зависает; мутации через SQL в membershiplib.

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
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) return apiError(c, 401, 'Unauthorized');

    var body = info.body || {};
    var action = String(body.action || '');
    var isMod = false;
    try {
      isMod = auth.getString('role') === 'moderator';
    } catch (roleErr) {
      return apiError(c, 400, 'role read: ' + errMessage(roleErr));
    }
    var targetUserId = body.userId || auth.id;
    if (!isMod) targetUserId = auth.id;

    console.log(
      '[membership-freeze] action=' + action + ' user=' + targetUserId + ' auth=' + auth.id
    );

    if (!targetUserId) return apiError(c, 400, 'Missing userId');
    if (action !== 'freeze' && action !== 'unfreeze') {
      return apiError(c, 400, 'Invalid action');
    }

    var lib = require(__hooks + '/membershiplib.js');
    var snapshot;
    if (action === 'freeze') {
      snapshot = lib.freezeUser($app, { targetUserId: targetUserId, actor: auth });
    } else {
      snapshot = lib.unfreezeUser($app, {
        targetUserId: targetUserId,
        actor: auth,
        reason: 'manual'
      });
    }
    console.log('[membership-freeze] ok');
    return c.json(200, { ok: true, user: snapshot });
  } catch (err) {
    var message = errMessage(err);
    console.log('[membership-freeze] catch: ' + message);
    return apiError(c, errStatus(err), message);
  }
});

routerAdd('POST', '/api/membership-stop', (c) => {
  console.log('[membership-stop] hit');
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) return apiError(c, 401, 'Unauthorized');

    var role = '';
    try {
      role = auth.getString('role');
    } catch (roleErr) {
      return apiError(c, 400, 'role read: ' + errMessage(roleErr));
    }
    if (role !== 'moderator') return apiError(c, 403, 'Forbidden');

    var body = info.body || {};
    var action = String(body.action || '');
    var targetUserId = body.userId;
    console.log(
      '[membership-stop] action=' + action + ' user=' + targetUserId + ' auth=' + auth.id
    );

    if (!targetUserId) return apiError(c, 400, 'Missing userId');
    if (action !== 'stop' && action !== 'start') {
      return apiError(c, 400, 'Invalid action');
    }

    var lib = require(__hooks + '/membershiplib.js');
    var snapshot;
    if (action === 'stop') {
      snapshot = lib.stopUser($app, { targetUserId: targetUserId, actor: auth });
    } else {
      snapshot = lib.startUser($app, { targetUserId: targetUserId, actor: auth });
    }
    console.log('[membership-stop] ok');
    return c.json(200, { ok: true, user: snapshot });
  } catch (err) {
    var message = errMessage(err);
    console.log('[membership-stop] catch: ' + message);
    return apiError(c, errStatus(err), message);
  }
});

console.log('--- MEMBERSHIP FREEZE/STOP LOADED ---');
