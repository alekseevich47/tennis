// Админ: аудитория рассылок/уведомлений и диспетчер scheduled_*.
// Файл без .pb.js — require() внутри хендлеров/cron.
// PB 0.23+: у Record нет getId() — использовать record.id.

function resolveAudienceUserIds(record, options) {
  const forBroadcast = options && options.forBroadcast;
  const audience = record.getString('audience') || 'all';

  if (audience === 'selected') {
    return record.get('recipients') || [];
  }

  let filter = '';
  if (audience === 'all_except_banned') {
    filter = 'is_banned != true';
  } else if (forBroadcast) {
    // Хотя бы один мессенджер (MAX или Telegram). Fallback max_id, если tg_id ещё нет в схеме.
    try {
      const users = $app.findRecordsByFilter(
        'users',
        '(max_id != "" || tg_id != "") && is_banned != true',
        '',
        0,
        0
      );
      const ids = [];
      for (let i = 0; i < users.length; i++) ids.push(users[i].id);
      return ids;
    } catch (err) {
      console.log('[admin] tg_id filter unavailable, fallback max_id: ' + err);
      filter = 'max_id != "" && is_banned != true';
    }
  } else {
    filter = '';
  }

  const users = $app.findRecordsByFilter('users', filter, '', 0, 0);
  const ids = [];
  for (let i = 0; i < users.length; i++) {
    ids.push(users[i].id);
  }
  return ids;
}

function dispatchScheduledBroadcast(record) {
  if (!record || record.getString('status') !== 'pending') return;

  try {
    const bot = require(__hooks + '/botlib.js');
    const text = bot.htmlToMaxMarkdown(record.getString('text'));
    const userIds = resolveAudienceUserIds(record, { forBroadcast: true });
    const attachments = bot.buildBroadcastImageAttachments
      ? bot.buildBroadcastImageAttachments(record)
      : bot.buildPublicFileAttachments(
          'scheduled_broadcasts',
          record.id,
          (function () {
            const mediaField = record.get('media');
            return mediaField
              ? Array.isArray(mediaField)
                ? mediaField
                : [mediaField]
              : [];
          })()
        );

    let tgMedia;
    try {
      const tg = require(__hooks + '/tgbotlib.js');
      tgMedia = (tg.isTgConfigured() && tg.isTgNotifyEnabled && tg.isTgNotifyEnabled())
        ? tg.prepareBroadcastMedia(record)
        : undefined;
    } catch (tgErr) {
      console.log('[admin] tg media: ' + tgErr);
    }

    bot.broadcastToUserIds(userIds, text, attachments, tgMedia);
    record.set('status', 'sent');
    $app.save(record);
    console.log('[admin] broadcast sent: ' + record.id + ' → ' + userIds.length + ' users');
    return userIds.length;
  } catch (err) {
    console.log('[admin] broadcast dispatch: ' + (err && err.stack ? err.stack : err));
    throw err;
  }
}

function dispatchScheduledNotification(record) {
  if (!record || record.getString('status') !== 'pending') return;

  try {
    const title = record.getString('title');
    const body = record.getString('body');
    const userIds = resolveAudienceUserIds(record, { forBroadcast: false });
    const collection = $app.findCollectionByNameOrId('notifications');

    for (let i = 0; i < userIds.length; i++) {
      const notification = new Record(collection);
      notification.set('recipient', userIds[i]);
      notification.set('title', title);
      notification.set('body', body);
      notification.set('is_read', false);
      $app.save(notification);
    }
    record.set('status', 'sent');
    $app.save(record);
    console.log('[admin] notification sent: ' + record.id + ' → ' + userIds.length + ' users');
    return userIds.length;
  } catch (err) {
    console.log('[admin] notification dispatch: ' + (err && err.stack ? err.stack : err));
    throw err;
  }
}

module.exports = {
  resolveAudienceUserIds: resolveAudienceUserIds,
  dispatchScheduledBroadcast: dispatchScheduledBroadcast,
  dispatchScheduledNotification: dispatchScheduledNotification
};
