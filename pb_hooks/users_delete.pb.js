// Полное удаление аккаунта модератором (из БД).

routerAdd('POST', '/api/users-delete', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const lib = require(__hooks + '/userdeletelib.js');

  try {
    const result = lib.deleteUserAccount($app, {
      targetUserId: body.targetUserId,
      actor: auth
    });
    return c.json(200, {
      success: true,
      deletedUserId: result.deletedUserId,
      fullName: result.fullName
    });
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    const message = (err && err.message) || String(err);
    console.log('[users-delete] ' + message);
    return c.json(status >= 400 && status < 600 ? status : 400, { error: message });
  }
});

console.log('--- USERS DELETE LOADED ---');
