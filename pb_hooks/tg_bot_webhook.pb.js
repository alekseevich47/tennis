// Webhook Telegram Bot API: /start (приветствие + снятие блокировки), my_chat_member (block/unblock).
// Регистрация: scripts/tg_bot_setup.sh (setWebhook c secret_token = TG_BOT_WEBHOOK_SECRET).
// Fail-closed: без секрета в env — 403. Полный payload не логируем (ПДн).
routerAdd('POST', '/api/tg-bot-webhook', (c) => {
  const info = c.requestInfo();
  const expectedSecret = $os.getenv('TG_BOT_WEBHOOK_SECRET') || '';
  if (!expectedSecret) {
    console.log('[tg] webhook: TG_BOT_WEBHOOK_SECRET не задан — запрос отклонён');
    return c.json(403, { error: 'Webhook not configured' });
  }
  const secretHeader = String(
    c.request.header.get('X-Telegram-Bot-Api-Secret-Token') ||
    (info.headers && info.headers['x_telegram_bot_api_secret_token']) ||
    ''
  );
  if (!secretHeader || !$security.equal(secretHeader, expectedSecret)) {
    console.log('[tg] webhook: неверный secret token');
    return c.json(403, { error: 'Forbidden' });
  }

  try {
    const tg = require(__hooks + '/tgbotlib.js');
    const body = info.body || {};

    const msg = body.message;
    if (msg && msg.chat && msg.chat.type === 'private' && msg.from && msg.from.is_bot !== true) {
      const text = typeof msg.text === 'string' ? msg.text : '';
      const tgId = tg.normalizeTgId(msg.from.id);
      if (tgId && /^\/start(\s|@|$)/.test(text)) {
        tg.markTgBlocked(tgId, false);
        try {
          const tpl = require(__hooks + '/templatelib.js');
          const resolved = tpl.resolve($app, 'bot.welcome', {});
          if (resolved && resolved.body) tg.sendWelcome(tgId, resolved.body);
        } catch (err) {
          console.log('[tg] webhook welcome: ' + err);
        }
        console.log('[tg] webhook /start');
      }
    }

    const member = body.my_chat_member;
    if (member && member.chat && member.chat.type === 'private' && member.new_chat_member) {
      const tgId = tg.normalizeTgId((member.from && member.from.id) || member.chat.id);
      const status = String(member.new_chat_member.status || '');
      if (tgId) {
        if (status === 'kicked') {
          tg.markTgBlocked(tgId, true);
          console.log('[tg] webhook my_chat_member: kicked');
        } else if (status === 'member') {
          tg.markTgBlocked(tgId, false);
          console.log('[tg] webhook my_chat_member: member');
        }
      }
    }
  } catch (err) {
    console.log('[tg] webhook: ' + err);
  }

  return c.json(200, { ok: true });
});

console.log('--- TELEGRAM BOT WEBHOOK LOADED ---');
