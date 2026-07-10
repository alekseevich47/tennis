// Серверный аудит «Турнир»-«Лента»: tournament_posts, tournament_comments (коллекция audit_events).
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
      category: 'tournament_feed',
      action: 'tournament.post.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'tournament_post',
      objectId: record.id,
      objectLabel: objectLabel,
      details: { textPreview: content.slice(0, 120) },
      summaryRu: name + ' опубликовал(а) итоги турнира ' + objectLabel,
      severity: 'info'
    });

    var participants = record.get('participants');
    if (!participants || !participants.length) return;

    var i;
    for (i = 0; i < participants.length; i++) {
      var p = participants[i];
      if (!p || !p.userId) continue;
      var targetLabel = p.fullName || 'Игрок';
      var target = { id: p.userId, label: targetLabel };
      var points = p.points != null ? p.points : 0;
      var place = p.place != null ? p.place : null;

      audit.logEvent($app, {
        category: 'tournament_feed',
        action: 'tournament.participant.mark',
        actionKind: 'create',
        subject: subject,
        target: target,
        objectType: 'tournament_post',
        objectId: record.id,
        objectLabel: objectLabel,
        details: place != null ? { place: place, points: points } : { points: points },
        summaryRu: name + ' отметил(а) участника ' + targetLabel + ' в ' + objectLabel,
        severity: 'info'
      });

      audit.logEvent($app, {
        category: 'tournament_feed',
        action: 'tournament.points.award',
        actionKind: 'other',
        subject: subject,
        target: target,
        objectType: 'tournament_post',
        objectId: record.id,
        objectLabel: objectLabel,
        details: { points: points },
        summaryRu: name + ' начислил(а) ' + points + ' очк. ' + targetLabel + ' (' + objectLabel + ')',
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[tournament-audit] tournament_posts create: ' + err);
  }
}, 'tournament_posts');

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
        category: 'tournament_feed',
        action: 'tournament.post.delete',
        actionKind: 'delete',
        subject: subject,
        objectType: 'tournament_post',
        objectId: record.id,
        objectLabel: objectLabel,
        summaryRu: name + ' удалил(а) публикацию турнира ' + objectLabel,
        severity: 'info'
      });
      return;
    }

    if (wasDeleted && !isDeleted) {
      audit.logEvent($app, {
        category: 'tournament_feed',
        action: 'tournament.post.restore',
        actionKind: 'restore',
        subject: subject,
        objectType: 'tournament_post',
        objectId: record.id,
        objectLabel: objectLabel,
        summaryRu: name + ' восстановил(а) публикацию турнира ' + objectLabel,
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, ['content', 'media']);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'tournament_feed',
        action: 'tournament.post.update',
        actionKind: 'update',
        subject: subject,
        objectType: 'tournament_post',
        objectId: record.id,
        objectLabel: objectLabel,
        diff: diff,
        summaryRu: name + ' отредактировал(а) публикацию турнира ' + objectLabel,
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[tournament-audit] tournament_posts update: ' + err);
  }
}, 'tournament_posts');

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
      category: 'tournament_feed',
      action: 'tournament.post.delete',
      actionKind: 'delete',
      subject: subject,
      objectType: 'tournament_post',
      objectId: record.id,
      objectLabel: objectLabel,
      summaryRu: name + ' окончательно удалил(а) публикацию турнира ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[tournament-audit] tournament_posts delete: ' + err);
  }
}, 'tournament_posts');

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
        var post = $app.findRecordById('tournament_posts', postId);
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
      category: 'tournament_feed',
      action: 'tournament.comment.create',
      actionKind: 'create',
      subject: subject,
      target: target,
      objectType: 'tournament_comment',
      objectId: record.id,
      objectLabel: postLabel,
      details: { postId: postId, textPreview: text.slice(0, 120) },
      summaryRu: name + ' оставил(а) комментарий к публикации турнира ' + postLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[tournament-audit] tournament_comments create: ' + err);
  }
}, 'tournament_comments');

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
        var post = $app.findRecordById('tournament_posts', postId);
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
        category: 'tournament_feed',
        action: 'tournament.comment.delete',
        actionKind: 'delete',
        subject: subject,
        target: target,
        objectType: 'tournament_comment',
        objectId: record.id,
        objectLabel: postLabel,
        summaryRu: name + ' удалил(а) комментарий к публикации турнира ' + postLabel,
        severity: 'info'
      });
      return;
    }

    if (wasDeleted && !isDeleted) {
      audit.logEvent($app, {
        category: 'tournament_feed',
        action: 'tournament.comment.restore',
        actionKind: 'restore',
        subject: subject,
        target: target,
        objectType: 'tournament_comment',
        objectId: record.id,
        objectLabel: postLabel,
        summaryRu: name + ' восстановил(а) комментарий к публикации турнира ' + postLabel,
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, ['text']);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'tournament_feed',
        action: 'tournament.comment.update',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'tournament_comment',
        objectId: record.id,
        objectLabel: postLabel,
        diff: diff,
        summaryRu: name + ' отредактировал(а) комментарий к публикации турнира ' + postLabel,
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[tournament-audit] tournament_comments update: ' + err);
  }
}, 'tournament_comments');

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
        var post = $app.findRecordById('tournament_posts', postId);
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
      category: 'tournament_feed',
      action: 'tournament.comment.delete',
      actionKind: 'delete',
      subject: subject,
      target: target,
      objectType: 'tournament_comment',
      objectId: record.id,
      objectLabel: postLabel,
      summaryRu: name + ' окончательно удалил(а) комментарий к публикации турнира ' + postLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[tournament-audit] tournament_comments delete: ' + err);
  }
}, 'tournament_comments');
