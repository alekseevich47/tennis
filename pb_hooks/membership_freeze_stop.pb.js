// API заморозки / остановки абонемента (только через сервер, не PATCH users).

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

/**
 * Не делать findRecordById(users, auth.id) — на стенде зависает (SQLite/auth).
 * Self → сам auth; чужой → findRecordById.
 */
function resolveTargetUser(auth, targetUserId) {
  var tid = String(targetUserId || '');
  if (auth && String(auth.id) === tid) {
    console.log('[membership] resolve=self');
    return auth;
  }
  console.log('[membership] resolve=find begin id=' + tid);
  try {
    var rec = $app.findRecordById('users', tid);
    console.log('[membership] resolve=find done');
    return rec;
  } catch (err) {
    console.log('[membership] resolve=find err: ' + errMessage(err));
    return null;
  }
}

routerAdd('POST', '/api/membership-freeze', (c) => {
  console.log('[membership-freeze] hit');
  try {
    console.log('[membership-freeze] step=info');
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) {
      return apiError(c, 401, 'Unauthorized');
    }
    console.log('[membership-freeze] step=auth ok id=' + auth.id);

    var body = info.body || {};
    var action = String(body.action || '');
    var isMod = false;
    try {
      isMod = auth.getString('role') === 'moderator';
    } catch (roleErr) {
      return apiError(c, 400, 'role read: ' + errMessage(roleErr));
    }
    var targetUserId = body.userId || auth.id;
    if (!isMod) {
      targetUserId = auth.id;
    }
    console.log('[membership-freeze] step=body action=' + action + ' user=' + targetUserId);

    if (!targetUserId) {
      return apiError(c, 400, 'Missing userId');
    }
    if (action !== 'freeze' && action !== 'unfreeze') {
      return apiError(c, 400, 'Invalid action');
    }

    var target = resolveTargetUser(auth, targetUserId);
    if (!target) {
      return apiError(c, 404, 'User not found');
    }
    console.log('[membership-freeze] step=target ok');

    console.log('[membership-freeze] step=require');
    var lib = require(__hooks + '/membershiplib.js');
    console.log('[membership-freeze] step=call');
    var snapshot;
    if (action === 'freeze') {
      snapshot = lib.freezeUser($app, { target: target, actor: auth });
    } else {
      snapshot = lib.unfreezeUser($app, { target: target, actor: auth, reason: 'manual' });
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
    console.log('[membership-stop] step=info');
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) {
      return apiError(c, 401, 'Unauthorized');
    }
    console.log('[membership-stop] step=auth ok id=' + auth.id);

    var role = '';
    try {
      role = auth.getString('role');
    } catch (roleErr) {
      return apiError(c, 400, 'role read: ' + errMessage(roleErr));
    }
    if (role !== 'moderator') {
      return apiError(c, 403, 'Forbidden');
    }

    var body = info.body || {};
    var action = String(body.action || '');
    var targetUserId = body.userId;
    console.log('[membership-stop] step=body action=' + action + ' user=' + targetUserId);

    if (!targetUserId) {
      return apiError(c, 400, 'Missing userId');
    }
    if (action !== 'stop' && action !== 'start') {
      return apiError(c, 400, 'Invalid action');
    }

    var target = resolveTargetUser(auth, targetUserId);
    if (!target) {
      return apiError(c, 404, 'User not found');
    }
    console.log('[membership-stop] step=target ok');

    console.log('[membership-stop] step=require');
    var lib = require(__hooks + '/membershiplib.js');
    console.log('[membership-stop] step=call');
    var snapshot;
    if (action === 'stop') {
      snapshot = lib.stopUser($app, { target: target, actor: auth });
    } else {
      snapshot = lib.startUser($app, { target: target, actor: auth });
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
