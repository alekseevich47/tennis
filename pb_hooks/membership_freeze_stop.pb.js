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

function safeBool(record, field) {
  try {
    return record.getBool(field) ? '1' : '0';
  } catch (e) {
    return 'err:' + errMessage(e);
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
    console.log('[membership-freeze] step=auth ok');

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

    var target = loadTargetUser(targetUserId);
    if (!target) {
      return apiError(c, 404, 'User not found');
    }
    console.log(
      '[membership-freeze] step=target frozen=' +
        safeBool(target, 'membership_frozen') +
        ' stopped=' +
        safeBool(target, 'membership_stopped')
    );

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
    console.log('[membership-stop] step=auth ok');

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

    var target = loadTargetUser(targetUserId);
    if (!target) {
      return apiError(c, 404, 'User not found');
    }
    console.log(
      '[membership-stop] step=target stopped=' +
        safeBool(target, 'membership_stopped') +
        ' frozen=' +
        safeBool(target, 'membership_frozen')
    );

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
