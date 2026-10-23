// Открыть личный чат MAX с игроком: WebView не умеет max:// —
// шлём модератору mention в чат бота, клиент открывает бота через https://max.ru/{bot}.
// Только moderator.

routerAdd('POST', '/api/users-open-max-chat', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const actorMaxId = String(auth.getString('max_id') || '').trim();
  if (!actorMaxId) {
    return c.json(400, {
      error: 'У вашего профиля нет max_id. Откройте мини-приложение из MAX.'
    });
  }

  const body = info.body || {};
  const targetUserId = String(body.targetUserId || '').trim();
  if (!targetUserId) {
    return c.json(400, { error: 'Укажите targetUserId' });
  }

  let target;
  try {
    target = $app.findRecordById('users', targetUserId);
  } catch (_) {
    return c.json(404, { error: 'Пользователь не найден' });
  }

  const targetMaxId = String(target.getString('max_id') || '').trim();
  if (!targetMaxId) {
    return c.json(400, { error: 'У игрока нет привязки MAX (max_id пуст)' });
  }

  const displayName = String(target.getString('full_name') || '').trim() || 'Пользователь';
  const bot = require(__hooks + '/botlib.js');
  const ok = bot.sendUserChatMention(actorMaxId, targetMaxId, displayName);
  if (!ok) {
    return c.json(502, {
      error: 'Не удалось отправить ссылку в MAX. Проверьте MAX_BOT_TOKEN и что бот не заблокирован.'
    });
  }

  return c.json(200, {
    success: true,
    targetMaxId: targetMaxId
  });
});
