// Claim MAX: привязка max_id (A) и объединение с дублем (B). Только moderator.

routerAdd('GET', '/api/users-claim-candidates', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const claim = require(__hooks + '/claimlib.js');
  const exclude = (info.query && info.query.exclude) || '';
  try {
    const candidates = claim.listClaimCandidates($app, exclude);
    return c.json(200, { candidates: candidates });
  } catch (err) {
    console.log('[claim] candidates: ' + err);
    return c.json(500, { error: 'Не удалось загрузить кандидатов' });
  }
});

routerAdd('POST', '/api/users-claim-max', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const claim = require(__hooks + '/claimlib.js');

  try {
    const result = claim.claimMax($app, {
      targetUserId: body.targetUserId,
      maxId: body.maxId,
      maxUserId: body.maxUserId,
      actor: auth
    });
    return c.json(200, {
      success: true,
      mode: result.mode,
      deletedUserId: result.deletedUserId || null,
      user: claim.userToJson(result.user)
    });
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    const message = (err && err.message) || String(err);
    console.log('[claim] claim-max: ' + message);
    return c.json(status >= 400 && status < 600 ? status : 400, { error: message });
  }
});

routerAdd('POST', '/api/users-unclaim-max', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const claim = require(__hooks + '/claimlib.js');

  try {
    const result = claim.unclaimMax($app, {
      targetUserId: body.targetUserId,
      actor: auth
    });
    return c.json(200, {
      success: true,
      maxId: result.maxId,
      user: claim.userToJson(result.user)
    });
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    const message = (err && err.message) || String(err);
    console.log('[claim] unclaim-max: ' + message);
    return c.json(status >= 400 && status < 600 ? status : 400, { error: message });
  }
});

console.log('--- USERS CLAIM MAX LOADED ---');
