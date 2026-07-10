// Серверный аудит «Галерея»: gallery, gallery_comments (коллекция audit_events).
// PB-хуки: helper вне callback недоступен — логика inline в каждом обработчике.

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var num = record.getFloat('post_number');
    var objectLabel = num ? '#' + num : '#' + record.id;
    var mediaType = record.getString('media_type') || '';
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'gallery',
      action: 'gallery.item.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'gallery_item',
      objectId: record.id,
      objectLabel: objectLabel,
      details: { mediaType: mediaType },
      summaryRu: name + ' добавил(а) в галерею ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[gallery-audit] gallery create: ' + err);
  }
}, 'gallery');

onRecordDeleteRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var num = record.getFloat('post_number');
    var objectLabel = num ? '#' + num : '#' + record.id;
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'gallery',
      action: 'gallery.item.delete',
      actionKind: 'delete',
      subject: subject,
      objectType: 'gallery_item',
      objectId: record.id,
      objectLabel: objectLabel,
      summaryRu: name + ' удалил(а) из галереи ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[gallery-audit] gallery delete: ' + err);
  }
}, 'gallery');

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var mediaId = record.getString('media_id');
    var mediaLabel = mediaId || '';
    if (mediaId) {
      try {
        var galleryItem = $app.findRecordById('gallery', mediaId);
        var pn = galleryItem.getFloat('post_number');
        mediaLabel = pn ? '#' + pn : '#' + mediaId;
      } catch (_) {}
    }
    var text = record.getString('text') || '';
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'gallery',
      action: 'gallery.comment.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'gallery_comment',
      objectId: record.id,
      objectLabel: mediaLabel,
      details: { mediaId: mediaId, textPreview: text.slice(0, 120) },
      summaryRu: name + ' оставил(а) комментарий к ' + mediaLabel + ' в галерее',
      severity: 'info'
    });
  } catch (err) {
    console.log('[gallery-audit] gallery_comments create: ' + err);
  }
}, 'gallery_comments');

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var mediaId = record.getString('media_id') || original.getString('media_id');
    var mediaLabel = mediaId || '';
    if (mediaId) {
      try {
        var galleryItem = $app.findRecordById('gallery', mediaId);
        var pn = galleryItem.getFloat('post_number');
        mediaLabel = pn ? '#' + pn : '#' + mediaId;
      } catch (_) {}
    }
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';
    var wasDeleted = original.getBool('is_deleted');
    var isDeleted = record.getBool('is_deleted');

    if (!wasDeleted && isDeleted) {
      audit.logEvent($app, {
        category: 'gallery',
        action: 'gallery.comment.delete',
        actionKind: 'delete',
        subject: subject,
        objectType: 'gallery_comment',
        objectId: record.id,
        objectLabel: mediaLabel,
        summaryRu: name + ' удалил(а) комментарий к ' + mediaLabel + ' в галерее',
        severity: 'info'
      });
      return;
    }

    if (wasDeleted && !isDeleted) {
      audit.logEvent($app, {
        category: 'gallery',
        action: 'gallery.comment.restore',
        actionKind: 'restore',
        subject: subject,
        objectType: 'gallery_comment',
        objectId: record.id,
        objectLabel: mediaLabel,
        summaryRu: name + ' восстановил(а) комментарий к ' + mediaLabel + ' в галерее',
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, ['text']);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'gallery',
        action: 'gallery.comment.update',
        actionKind: 'update',
        subject: subject,
        objectType: 'gallery_comment',
        objectId: record.id,
        objectLabel: mediaLabel,
        diff: diff,
        summaryRu: name + ' отредактировал(а) комментарий к ' + mediaLabel + ' в галерее',
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[gallery-audit] gallery_comments update: ' + err);
  }
}, 'gallery_comments');

onRecordDeleteRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var mediaId = record.getString('media_id');
    var mediaLabel = mediaId || '';
    if (mediaId) {
      try {
        var galleryItem = $app.findRecordById('gallery', mediaId);
        var pn = galleryItem.getFloat('post_number');
        mediaLabel = pn ? '#' + pn : '#' + mediaId;
      } catch (_) {}
    }
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'gallery',
      action: 'gallery.comment.delete',
      actionKind: 'delete',
      subject: subject,
      objectType: 'gallery_comment',
      objectId: record.id,
      objectLabel: mediaLabel,
      summaryRu: name + ' окончательно удалил(а) комментарий к ' + mediaLabel + ' в галерее',
      severity: 'info'
    });
  } catch (err) {
    console.log('[gallery-audit] gallery_comments delete: ' + err);
  }
}, 'gallery_comments');
