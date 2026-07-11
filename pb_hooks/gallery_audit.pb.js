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
    var commentId = record.id;
    var author = audit.resolveCommentAuthor($app, record, null);
    var name = audit.displayName(subject);

    audit.logEvent($app, {
      category: 'gallery',
      action: 'gallery.comment.create',
      actionKind: 'create',
      subject: subject,
      target: author,
      objectType: 'gallery_comment',
      objectId: commentId,
      objectLabel: mediaLabel,
      details: audit.buildCommentDetails({
        commentId: commentId,
        text: text,
        author: author,
        extra: { mediaId: mediaId }
      }),
      summaryRu: name + ' оставил(а) комментарий (id ' + commentId + ') к ' + mediaLabel + ' в галерее: «' + audit.truncateText(text) + '»',
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
    var commentId = record.id;
    var author = audit.resolveCommentAuthor($app, record, original);
    var authorLabel = author ? author.label : 'Игрок';
    var authorId = author ? author.id : '';
    var name = audit.displayName(subject);
    var wasDeleted = original.getBool('is_deleted');
    var isDeleted = record.getBool('is_deleted');

    if (!wasDeleted && isDeleted) {
      return;
    }

    if (wasDeleted && !isDeleted) {
      audit.logEvent($app, {
        category: 'gallery',
        action: 'gallery.comment.restore',
        actionKind: 'restore',
        subject: subject,
        target: author,
        objectType: 'gallery_comment',
        objectId: commentId,
        objectLabel: mediaLabel,
        details: audit.buildCommentDetails({
          commentId: commentId,
          text: original.getString('text') || '',
          author: author,
          actor: subject,
          extra: { mediaId: mediaId }
        }),
        summaryRu: name + ' восстановил(а) комментарий (id ' + commentId + ') автора ' + authorLabel + ' (id ' + authorId + ')',
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, ['text']);
    if (diff.length) {
      var commentText = original.getString('text') || '';
      audit.logEvent($app, {
        category: 'gallery',
        action: 'gallery.comment.update',
        actionKind: 'update',
        subject: subject,
        target: author,
        objectType: 'gallery_comment',
        objectId: commentId,
        objectLabel: mediaLabel,
        diff: diff,
        details: audit.buildCommentDetails({
          commentId: commentId,
          text: commentText,
          author: author,
          actor: subject,
          extra: { mediaId: mediaId }
        }),
        summaryRu: name + ' отредактировал(а) комментарий (id ' + commentId + ') автора ' + authorLabel + ' (id ' + authorId + '): «' + audit.truncateText(commentText) + '»',
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
    var text = record.getString('text') || '';
    var commentId = record.id;
    var author = audit.resolveCommentAuthor($app, record, null);
    var authorLabel = author ? author.label : 'Игрок';
    var authorId = author ? author.id : '';
    var name = audit.displayName(subject);

    audit.logEvent($app, {
      category: 'gallery',
      action: 'gallery.comment.delete',
      actionKind: 'delete',
      subject: subject,
      target: author,
      objectType: 'gallery_comment',
      objectId: commentId,
      objectLabel: mediaLabel,
      details: audit.buildCommentDetails({
        commentId: commentId,
        text: text,
        author: author,
        actor: subject,
        extra: { mediaId: mediaId }
      }),
      summaryRu: name + ' удалил(а) комментарий (id ' + commentId + ') автора ' + authorLabel + ' (id ' + authorId + '): «' + audit.truncateText(text) + '»',
      severity: 'info'
    });
  } catch (err) {
    console.log('[gallery-audit] gallery_comments delete: ' + err);
  }
}, 'gallery_comments');
