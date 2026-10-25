// Вход в Mini App из Telegram: HMAC initData (TG_BOT_TOKEN) → PocketBase token.
// Подпись и свежесть auth_date проверяются ДО любого find/save.
// Поиск только по tg_id; привязка tg_id к существующему профилю — claim модератором.
routerAdd('POST', '/api/tg-auth', (c) => {
  const authAudit = require(__hooks + '/auth_audit_lib.js');
  const body = c.requestInfo().body || {};
  const channel = 'telegram';

  try {
    const authlib = require(__hooks + '/maxauthlib.js');
    const tg = require(__hooks + '/tgbotlib.js');
    const initData = typeof body.initData === 'string' ? body.initData : '';
    if (!initData) {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        failReason: 'missing_init_data'
      });
      return c.json(400, { error: 'initData property is missing in JSON payload' });
    }

    const botToken = $os.getenv('TG_BOT_TOKEN');
    if (!botToken) {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        failReason: 'auth_not_configured'
      });
      return c.json(500, { error: 'Auth not configured' });
    }

    // Telegram: auth_date ≤ 900 с; reload после 15 мин — fallback на локальную сессию (useMaxAuth).
    const verified = authlib.verifyWebAppInitData(initData, botToken, 900);
    if (!verified.ok) {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        failReason: verified.reason === 'auth_date_expired' ? 'auth_date_expired' : 'invalid_signature'
      });
      return c.json(401, { error: 'invalid signature' });
    }

    let userData;
    try {
      userData = JSON.parse(verified.fields.user || '');
    } catch (_) {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        failReason: 'missing_user_data'
      });
      return c.json(400, { error: 'User data object not found in initData string' });
    }
    if (!userData || typeof userData !== 'object') {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        failReason: 'missing_user_data'
      });
      return c.json(400, { error: 'User data object not found in initData string' });
    }
    if (userData.is_bot === true) {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        failReason: 'is_bot'
      });
      return c.json(403, { error: 'Forbidden' });
    }

    const tgId = tg.normalizeTgId(userData.id);
    if (!tgId || tgId.charAt(0) === '-') {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        failReason: 'invalid_user_id'
      });
      return c.json(400, { error: 'Valid user id property not found in user object' });
    }

    const firstName = String(userData.first_name || userData.username || 'Игрок Telegram').slice(0, 64);
    const lastName = String(userData.last_name || '').slice(0, 64);
    const fullName = (firstName + ' ' + lastName).trim();
    const photoUrl = String(userData.photo_url || '');
    const tgAvatarUrl = /^https:\/\//i.test(photoUrl) ? photoUrl.slice(0, 500) : '';

    let user = null;
    let isNewUser = false;
    try {
      user = $app.findFirstRecordByFilter('users', 'tg_id = {:tgId}', { tgId: tgId });
    } catch (_) {
      user = null;
    }

    if (user) {
      // full_name не перезаписываем (редактируется в приложении); avatar_url — только если пришёл.
      if (tgAvatarUrl && user.getString('avatar_url') !== tgAvatarUrl) {
        user.set('avatar_url', tgAvatarUrl);
        $app.save(user);
      }
    } else {
      isNewUser = true;
      const collection = $app.findCollectionByNameOrId('users');
      user = new Record(collection);
      user.set('tg_id', tgId);
      user.set('full_name', fullName);
      user.set('avatar_url', tgAvatarUrl);
      user.set('role', 'user');
      user.set('rating_points', 0);
      // Bool без default в схеме = false; $app.save не бьёт onRecordCreateRequest.
      user.set('is_visible', true);
      user.set('can_comment', true);
      user.set('onboarding_completed', false);
      user.set('name_set_in_onboarding', false);
      user.set('tg_bot_blocked', false);
      user.set('max_bot_blocked', false);
      user.set('bot_blocked', false);
      // После unclaim email tg_<id>@… может остаться у другого профиля — суффикс при коллизии.
      let email = 'tg_' + tgId + '@tg-app.local';
      try {
        $app.findAuthRecordByEmail('users', email);
        email = 'tg_' + tgId + '_' + $security.randomString(6).toLowerCase() + '@tg-app.local';
      } catch (_) {}
      user.set('email', email);
      user.setPassword($security.randomString(30));
      $app.save(user);
    }

    const appFullName = user.getString('full_name') || fullName;

    if (user.getBool('is_banned')) {
      authAudit.logAuthAttempt($app, c, {
        channel: channel,
        body: body,
        action: 'auth.denied',
        userId: user.id,
        fullName: appFullName,
        tgId: tgId,
        firstNameRaw: firstName,
        lastNameRaw: lastName,
        isNewUser: isNewUser,
        failReason: 'banned'
      });
      return c.json(403, {
        error: 'Ваш аккаунт заблокирован',
        ban_reason: user.get('ban_reason') || '',
        banned_at: user.get('banned_at') || ''
      });
    }

    authAudit.logAuthAttempt($app, c, {
      channel: channel,
      body: body,
      action: isNewUser ? 'auth.register' : 'auth.login',
      userId: user.id,
      fullName: appFullName,
      tgId: tgId,
      firstNameRaw: firstName,
      lastNameRaw: lastName,
      isNewUser: isNewUser
    });

    const token = user.newAuthToken();
    return c.json(200, {
      success: true,
      token: token,
      user: {
        id: user.id,
        max_id: user.get('max_id'),
        full_name: user.get('full_name'),
        avatar_url: user.get('avatar_url'),
        dominant_hand: user.get('dominant_hand'),
        role: user.get('role'),
        wins: user.get('wins'),
        bot_blocked: user.getBool('bot_blocked'),
        bot_blocked_at: user.get('bot_blocked_at') || ''
      }
    });
  } catch (err) {
    console.log('[tg-auth] ' + err);
    authAudit.logAuthAttempt($app, c, {
      channel: channel,
      body: body,
      action: 'auth.denied',
      failReason: 'server_error'
    });
    return c.json(500, { error: 'Server auth exception' });
  }
});

console.log('--- TELEGRAM AUTH LOADED ---');
