// Серверный аудит «Лента»: posts, comments (коллекция audit_events).
// PB-хуки: helper вне callback недоступен — логика inline в каждом обработчике.

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var content = record.getString('content') || '';
    var num = record.getFloat('post_number');
    var objectLabel = num ? '#' + num : '#' + record.id;
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'feed',
      action: 'feed.post.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'post',
      objectId: record.id,
      objectLabel: objectLabel,
      details: { textPreview: content.slice(0, 120) },
      summaryRu: name + ' опубликовал(а) пост ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[feed-audit] posts create: ' + err);
  }
}, 'posts');

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

    var num = record.getFloat('post_number') || original.getFloat('post_number');
    var objectLabel = num ? '#' + num : '#' + record.id;
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';
    var wasDeleted = original.getBool('is_deleted');
    var isDeleted = record.getBool('is_deleted');

    if (!wasDeleted && isDeleted) {
      audit.logEvent($app, {
        category: 'feed',
        action: 'feed.post.delete',
        actionKind: 'delete',
        subject: subject,
        objectType: 'post',
        objectId: record.id,
        objectLabel: objectLabel,
        summaryRu: name + ' удалил(а) пост ' + objectLabel,
        severity: 'info'
      });
      return;
    }

    if (wasDeleted && !isDeleted) {
      audit.logEvent($app, {
        category: 'feed',
        action: 'feed.post.restore',
        actionKind: 'restore',
        subject: subject,
        objectType: 'post',
        objectId: record.id,
        objectLabel: objectLabel,
        summaryRu: name + ' восстановил(а) пост ' + objectLabel,
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, ['content', 'media']);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'feed',
        action: 'feed.post.update',
        actionKind: 'update',
        subject: subject,
        objectType: 'post',
        objectId: record.id,
        objectLabel: objectLabel,
        diff: diff,
        summaryRu: name + ' отредактировал(а) пост ' + objectLabel,
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[feed-audit] posts update: ' + err);
  }
}, 'posts');

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
      category: 'feed',
      action: 'feed.post.delete',
      actionKind: 'delete',
      subject: subject,
      objectType: 'post',
      objectId: record.id,
      objectLabel: objectLabel,
      summaryRu: name + ' окончательно удалил(а) пост ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[feed-audit] posts delete: ' + err);
  }
}, 'posts');

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var postId = record.getString('post');
    var postLabel = postId || '';
    var target = null;
    if (postId) {
      try {
        var post = $app.findRecordById('posts', postId);
        var pn = post.getFloat('post_number');
        postLabel = pn ? '#' + pn : '#' + postId;
        var authorId = post.getString('author');
        if (authorId) {
          try {
            var author = $app.findRecordById('users', authorId);
            if (author) {
              target = { id: authorId, label: author.getString('full_name') || 'Игрок' };
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
    var text = record.getString('text') || '';
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'feed',
      action: 'feed.comment.create',
      actionKind: 'create',
      subject: subject,
      target: target,
      objectType: 'comment',
      objectId: record.id,
      objectLabel: postLabel,
      details: { postId: postId, textPreview: text.slice(0, 120) },
      summaryRu: name + ' оставил(а) комментарий к посту ' + postLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[feed-audit] comments create: ' + err);
  }
}, 'comments');

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

    var postId = record.getString('post') || original.getString('post');
    var postLabel = postId || '';
    var target = null;
    if (postId) {
      try {
        var post = $app.findRecordById('posts', postId);
        var pn = post.getFloat('post_number');
        postLabel = pn ? '#' + pn : '#' + postId;
        var authorId = post.getString('author');
        if (authorId) {
          try {
            var author = $app.findRecordById('users', authorId);
            if (author) {
              target = { id: authorId, label: author.getString('full_name') || 'Игрок' };
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';
    var wasDeleted = original.getBool('is_deleted');
    var isDeleted = record.getBool('is_deleted');

    if (!wasDeleted && isDeleted) {
      audit.logEvent($app, {
        category: 'feed',
        action: 'feed.comment.delete',
        actionKind: 'delete',
        subject: subject,
        target: target,
        objectType: 'comment',
        objectId: record.id,
        objectLabel: postLabel,
        summaryRu: name + ' удалил(а) комментарий к посту ' + postLabel,
        severity: 'info'
      });
      return;
    }

    if (wasDeleted && !isDeleted) {
      audit.logEvent($app, {
        category: 'feed',
        action: 'feed.comment.restore',
        actionKind: 'restore',
        subject: subject,
        target: target,
        objectType: 'comment',
        objectId: record.id,
        objectLabel: postLabel,
        summaryRu: name + ' восстановил(а) комментарий к посту ' + postLabel,
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, ['text']);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'feed',
        action: 'feed.comment.update',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'comment',
        objectId: record.id,
        objectLabel: postLabel,
        diff: diff,
        summaryRu: name + ' отредактировал(а) комментарий к посту ' + postLabel,
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[feed-audit] comments update: ' + err);
  }
}, 'comments');

onRecordDeleteRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var postId = record.getString('post');
    var postLabel = postId || '';
    var target = null;
    if (postId) {
      try {
        var post = $app.findRecordById('posts', postId);
        var pn = post.getFloat('post_number');
        postLabel = pn ? '#' + pn : '#' + postId;
        var authorId = post.getString('author');
        if (authorId) {
          try {
            var author = $app.findRecordById('users', authorId);
            if (author) {
              target = { id: authorId, label: author.getString('full_name') || 'Игрок' };
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'feed',
      action: 'feed.comment.delete',
      actionKind: 'delete',
      subject: subject,
      target: target,
      objectType: 'comment',
      objectId: record.id,
      objectLabel: postLabel,
      summaryRu: name + ' окончательно удалил(а) комментарий к посту ' + postLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[feed-audit] comments delete: ' + err);
  }
}, 'comments');
