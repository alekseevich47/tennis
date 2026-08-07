// Ручное добавление игрока (модератор). $app.save — password hidden + manageRule null.

routerAdd('POST', '/api/users-create-manual', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  let avatarFile = null;
  try {
    const files = c.findUploadedFiles('avatar');
    if (files && files.length > 0) {
      avatarFile = files[0];
    }
  } catch (_) {
    // поле avatar необязательно
  }

  const lib = require(__hooks + '/manualuserlib.js');
  try {
    const user = lib.createManualUser($app, {
      full_name: body.full_name,
      birth_date: body.birth_date,
      dominant_hand: body.dominant_hand,
      rating_points: body.rating_points,
      avatarFile: avatarFile
    });
    const claim = require(__hooks + '/claimlib.js');
    return c.json(200, { success: true, user: claim.userToJson(user) });
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    const message = (err && err.message) || String(err);
    console.log('[users-manual] create: ' + message);
    return c.json(status >= 400 && status < 600 ? status : 400, { error: message });
  }
});

console.log('--- USERS MANUAL CREATE LOADED ---');
