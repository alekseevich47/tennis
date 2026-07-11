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
      summaryRu: name + ' удалил(а) публикацию турнира ' + objectLabel,
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
    if (postId) {
      try {
        var post = $app.findRecordById('tournament_posts', postId);
        var pn = post.getFloat('post_number');
        postLabel = pn ? '#' + pn : '#' + postId;
      } catch (_) {}
    }
    var text = record.getString('text') || '';
    var commentId = record.id;
    var author = audit.resolveCommentAuthor($app, record, null);
    var name = audit.displayName(subject);

    audit.logEvent($app, {
      category: 'tournament_feed',
      action: 'tournament.comment.create',
      actionKind: 'create',
      subject: subject,
      target: author,
      objectType: 'tournament_comment',
      objectId: commentId,
      objectLabel: postLabel,
      details: audit.buildCommentDetails({
        commentId: commentId,
        text: text,
        author: author,
        extra: { postId: postId }
      }),
      summaryRu: name + ' оставил(а) комментарий (id ' + commentId + ') к публикации турнира ' + postLabel + ': «' + audit.truncateText(text) + '»',
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
    if (postId) {
      try {
        var post = $app.findRecordById('tournament_posts', postId);
        var pn = post.getFloat('post_number');
        postLabel = pn ? '#' + pn : '#' + postId;
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
        category: 'tournament_feed',
        action: 'tournament.comment.restore',
        actionKind: 'restore',
        subject: subject,
        target: author,
        objectType: 'tournament_comment',
        objectId: commentId,
        objectLabel: postLabel,
        details: audit.buildCommentDetails({
          commentId: commentId,
          text: original.getString('text') || '',
          author: author,
          actor: subject,
          extra: { postId: postId }
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
        category: 'tournament_feed',
        action: 'tournament.comment.update',
        actionKind: 'update',
        subject: subject,
        target: author,
        objectType: 'tournament_comment',
        objectId: commentId,
        objectLabel: postLabel,
        diff: diff,
        details: audit.buildCommentDetails({
          commentId: commentId,
          text: commentText,
          author: author,
          actor: subject,
          extra: { postId: postId }
        }),
        summaryRu: name + ' отредактировал(а) комментарий (id ' + commentId + ') автора ' + authorLabel + ' (id ' + authorId + '): «' + audit.truncateText(commentText) + '»',
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
    if (postId) {
      try {
        var post = $app.findRecordById('tournament_posts', postId);
        var pn = post.getFloat('post_number');
        postLabel = pn ? '#' + pn : '#' + postId;
      } catch (_) {}
    }
    var text = record.getString('text') || '';
    var commentId = record.id;
    var author = audit.resolveCommentAuthor($app, record, null);
    var authorLabel = author ? author.label : 'Игрок';
    var authorId = author ? author.id : '';
    var name = audit.displayName(subject);

    audit.logEvent($app, {
      category: 'tournament_feed',
      action: 'tournament.comment.delete',
      actionKind: 'delete',
      subject: subject,
      target: author,
      objectType: 'tournament_comment',
      objectId: commentId,
      objectLabel: postLabel,
      details: audit.buildCommentDetails({
        commentId: commentId,
        text: text,
        author: author,
        actor: subject,
        extra: { postId: postId }
      }),
      summaryRu: name + ' удалил(а) комментарий (id ' + commentId + ') автора ' + authorLabel + ' (id ' + authorId + '): «' + audit.truncateText(text) + '»',
      severity: 'info'
    });
  } catch (err) {
    console.log('[tournament-audit] tournament_comments delete: ' + err);
  }
}, 'tournament_comments');
