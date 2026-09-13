// Server-side logout (Strix LOW: нет отзыва сессии).
// Ротация tokenKey гасит ранее выданные JWT (как при бане в users_ban_auth.pb.js).
// Refresh-invalidation — в users_ban_auth.pb.js (один handler на коллекцию).

routerAdd('POST', '/api/logout', (c) => {
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) {
      return c.json(401, { error: 'Unauthorized' });
    }
    try {
      var user = $app.findRecordById('users', auth.id);
      user.set('tokenKey', $security.randomString(50));
      $app.save(user);
    } catch (err) {
      console.log('[logout] ' + err);
      return c.json(500, { error: 'Internal error' });
    }
    return c.json(200, { success: true });
  } catch (err) {
    console.log('[logout] route: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});
