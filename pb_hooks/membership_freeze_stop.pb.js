// API заморозки / остановки абонемента.
// Без findRecordById('users') — на стенде зависает; мутации через SQL в membershiplib.
// Хелперы — в membershipapilib.js (top-level из .pb.js хендлеру недоступны).

routerAdd('POST', '/api/membership-freeze', (c) => {
  var api = require(__hooks + '/membershipapilib.js');
  console.log('[membership-freeze] hit');
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) return api.apiError(c, 401, 'Unauthorized');

    var body = info.body || {};
    var action = String(body.action || '');
    var isMod = false;
    try {
      isMod = auth.getString('role') === 'moderator';
    } catch (roleErr) {
      return api.apiError(c, 400, 'role read: ' + api.errMessage(roleErr));
    }
    var targetUserId = body.userId || auth.id;
    if (!isMod) targetUserId = auth.id;

    console.log(
      '[membership-freeze] action=' + action + ' user=' + targetUserId + ' auth=' + auth.id
    );

    if (!targetUserId) return api.apiError(c, 400, 'Missing userId');
    if (action !== 'freeze' && action !== 'unfreeze') {
      return api.apiError(c, 400, 'Invalid action');
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
    var message = api.errMessage(err);
    console.log('[membership-freeze] catch: ' + message);
    return api.apiError(c, api.errStatus(err), message);
  }
});

routerAdd('POST', '/api/membership-stop', (c) => {
  var api = require(__hooks + '/membershipapilib.js');
  console.log('[membership-stop] hit');
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) return api.apiError(c, 401, 'Unauthorized');

    var role = '';
    try {
      role = auth.getString('role');
    } catch (roleErr) {
      return api.apiError(c, 400, 'role read: ' + api.errMessage(roleErr));
    }
    if (role !== 'moderator') return api.apiError(c, 403, 'Forbidden');

    var body = info.body || {};
    var action = String(body.action || '');
    var targetUserId = body.userId;
    console.log(
      '[membership-stop] action=' + action + ' user=' + targetUserId + ' auth=' + auth.id
    );

    if (!targetUserId) return api.apiError(c, 400, 'Missing userId');
    if (action !== 'stop' && action !== 'start') {
      return api.apiError(c, 400, 'Invalid action');
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
    var message = api.errMessage(err);
    console.log('[membership-stop] catch: ' + message);
    return api.apiError(c, api.errStatus(err), message);
  }
});

console.log('--- MEMBERSHIP FREEZE/STOP LOADED ---');
