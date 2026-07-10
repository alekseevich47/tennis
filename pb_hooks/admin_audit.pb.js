// Серверный аудит «Админ-панель»: scheduled_broadcasts, scheduled_notifications, notification_settings.
// PB-хуки: helper вне callback недоступен — логика inline в каждом обработчике.

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var adminlib = require(__hooks + '/adminlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'moderator';
    var record = e.record;
    var text = record.getString('text') || '';
    var scheduledAt = record.getString('scheduled_at') || '';
    var audience = record.getString('audience') || 'all';
    var recipientsCount = 0;
    try {
      recipientsCount = adminlib.resolveAudienceUserIds(record, { forBroadcast: true }).length;
    } catch (_) {}
    var sendNow = false;
    if (scheduledAt) {
      try {
        var schedMs = new Date(String(scheduledAt).replace(' ', 'T')).getTime();
        if (!isNaN(schedMs) && Math.abs(Date.now() - schedMs) < 120000) sendNow = true;
      } catch (_) {}
    }
    var objectLabel = text.slice(0, 60) || 'Рассылка #' + record.id;
    var name = 'Модератор';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }
    var summaryRu = sendNow
      ? name + ' создал(а) рассылку MAX для немедленной отправки'
      : name + ' запланировал(а) рассылку MAX';

    audit.logEvent($app, {
      category: 'admin',
      action: 'admin.broadcast.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'scheduled_broadcast',
      objectId: record.id,
      objectLabel: objectLabel,
      effectiveAt: scheduledAt || undefined,
      details: {
        audience: audience,
        recipientsCount: recipientsCount,
        sendNow: sendNow,
        scheduledAt: scheduledAt,
        textPreview: text.slice(0, 120)
      },
      summaryRu: summaryRu,
      severity: 'info'
    });
  } catch (err) {
    console.log('[admin-audit] scheduled_broadcasts create: ' + err);
  }
}, 'scheduled_broadcasts');

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'moderator';
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var text = record.getString('text') || original.getString('text') || '';
    var objectLabel = text.slice(0, 60) || 'Рассылка #' + record.id;
    var name = 'Модератор';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }

    var prevStatus = original.getString('status');
    var nextStatus = record.getString('status');
    if (prevStatus !== 'cancelled' && nextStatus === 'cancelled') {
      audit.logEvent($app, {
        category: 'admin',
        action: 'admin.broadcast.delete',
        actionKind: 'delete',
        subject: subject,
        objectType: 'scheduled_broadcast',
        objectId: record.id,
        objectLabel: objectLabel,
        summaryRu: name + ' отменил(а) запланированную рассылку MAX',
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, [
      'text', 'audience', 'recipients', 'scheduled_at', 'media'
    ]);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'admin',
        action: 'admin.broadcast.update',
        actionKind: 'update',
        subject: subject,
        objectType: 'scheduled_broadcast',
        objectId: record.id,
        objectLabel: objectLabel,
        diff: diff,
        summaryRu: name + ' изменил(а) запланированную рассылку MAX',
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[admin-audit] scheduled_broadcasts update: ' + err);
  }
}, 'scheduled_broadcasts');

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var adminlib = require(__hooks + '/adminlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'moderator';
    var record = e.record;
    var title = record.getString('title') || '';
    var body = record.getString('body') || '';
    var scheduledAt = record.getString('scheduled_at') || '';
    var audience = record.getString('audience') || 'all';
    var recipientsCount = 0;
    try {
      recipientsCount = adminlib.resolveAudienceUserIds(record, { forBroadcast: false }).length;
    } catch (_) {}
    var sendNow = false;
    if (scheduledAt) {
      try {
        var schedMs = new Date(String(scheduledAt).replace(' ', 'T')).getTime();
        if (!isNaN(schedMs) && Math.abs(Date.now() - schedMs) < 120000) sendNow = true;
      } catch (_) {}
    }
    var objectLabel = title || 'Уведомление #' + record.id;
    var name = 'Модератор';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }
    var summaryRu = sendNow
      ? name + ' создал(а) уведомление для немедленной отправки'
      : name + ' запланировал(а) уведомление';

    audit.logEvent($app, {
      category: 'admin',
      action: 'admin.notification.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'scheduled_notification',
      objectId: record.id,
      objectLabel: objectLabel,
      effectiveAt: scheduledAt || undefined,
      details: {
        audience: audience,
        recipientsCount: recipientsCount,
        sendNow: sendNow,
        scheduledAt: scheduledAt,
        title: title,
        bodyPreview: body.slice(0, 120)
      },
      summaryRu: summaryRu,
      severity: 'info'
    });
  } catch (err) {
    console.log('[admin-audit] scheduled_notifications create: ' + err);
  }
}, 'scheduled_notifications');

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'moderator';
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var title = record.getString('title') || original.getString('title') || '';
    var objectLabel = title || 'Уведомление #' + record.id;
    var name = 'Модератор';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }

    var prevStatus = original.getString('status');
    var nextStatus = record.getString('status');
    if (prevStatus !== 'cancelled' && nextStatus === 'cancelled') {
      audit.logEvent($app, {
        category: 'admin',
        action: 'admin.notification.delete',
        actionKind: 'delete',
        subject: subject,
        objectType: 'scheduled_notification',
        objectId: record.id,
        objectLabel: objectLabel,
        summaryRu: name + ' отменил(а) запланированное уведомление',
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, [
      'title', 'body', 'audience', 'recipients', 'scheduled_at'
    ]);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'admin',
        action: 'admin.notification.update',
        actionKind: 'update',
        subject: subject,
        objectType: 'scheduled_notification',
        objectId: record.id,
        objectLabel: objectLabel,
        diff: diff,
        summaryRu: name + ' изменил(а) запланированное уведомление',
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[admin-audit] scheduled_notifications update: ' + err);
  }
}, 'scheduled_notifications');

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'moderator';
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var settingLabels = {
      training_reminder_enabled: 'Напоминание о тренировках',
      training_created_enabled: 'Создание тренировки',
      training_edited_enabled: 'Изменение тренировки',
      training_deleted_enabled: 'Отмена тренировки',
      training_booking_enabled: 'Запись участников',
      comments_notification_enabled: 'Уведомления о комментариях',
      posts_created_enabled: 'Создание постов (лента)',
      tournament_posts_created_enabled: 'Создание постов (турнир)'
    };
    var settingFields = [
      'training_reminder_enabled',
      'training_created_enabled',
      'training_edited_enabled',
      'training_deleted_enabled',
      'training_booking_enabled',
      'comments_notification_enabled',
      'posts_created_enabled',
      'tournament_posts_created_enabled'
    ];

    var name = 'Модератор';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }

    var i;
    for (i = 0; i < settingFields.length; i++) {
      var field = settingFields[i];
      var wasOn = original.getBool(field);
      var isOn = record.getBool(field);
      if (wasOn === isOn) continue;

      var label = settingLabels[field] || field;
      var verb = isOn ? 'включил(а)' : 'выключил(а)';

      audit.logEvent($app, {
        category: 'admin',
        action: 'admin.notification_setting.toggle',
        actionKind: 'update',
        subject: subject,
        objectType: 'notification_setting',
        objectId: record.id,
        objectLabel: label,
        details: { field: field, value: isOn },
        summaryRu: name + ' ' + verb + ' «' + label + '»',
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[admin-audit] notification_settings update: ' + err);
  }
}, 'notification_settings');
