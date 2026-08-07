// Полное удаление users: отвязка relations + удаление owned-записей + delete record.

function relationIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    var out = [];
    for (var i = 0; i < value.length; i++) {
      out.push(String(value[i]));
    }
    return out;
  }
  return [String(value)];
}

function removeFromIdList(ids, userId) {
  var result = [];
  var changed = false;
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i]);
    if (id === userId) {
      changed = true;
      continue;
    }
    result.push(id);
  }
  return { changed: changed, ids: result };
}

function removeFromMultiField(app, collection, field, userId) {
  var records;
  try {
    records = app.findRecordsByFilter(
      collection,
      field + ' ?= {:userId}',
      '',
      0,
      0,
      { userId: userId }
    );
  } catch (_) {
    return;
  }
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var updated = removeFromIdList(relationIds(rec.get(field)), userId);
    if (!updated.changed) continue;
    rec.set(field, updated.ids);
    try {
      app.save(rec);
    } catch (_) {}
  }
}

function deleteRecordsByField(app, collection, field, userId) {
  var records;
  try {
    records = app.findRecordsByFilter(
      collection,
      field + ' = {:userId}',
      '',
      0,
      0,
      { userId: userId }
    );
  } catch (_) {
    return 0;
  }
  var n = 0;
  for (var i = 0; i < records.length; i++) {
    try {
      app.delete(records[i]);
      n++;
    } catch (_) {}
  }
  return n;
}

function removeFromTournamentParticipants(app, userId) {
  var records;
  try {
    records = app.findRecordsByFilter('tournament_posts', 'id != ""', '-created', 0, 0);
  } catch (_) {
    return;
  }
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var parts = rec.get('participants');
    if (!parts || !parts.length) continue;
    var changed = false;
    var next = [];
    for (var p = 0; p < parts.length; p++) {
      var row = parts[p] || {};
      if (String(row.userId || '') === userId) {
        changed = true;
        continue;
      }
      next.push(row);
    }
    if (!changed) continue;
    rec.set('participants', next);
    try {
      app.save(rec);
    } catch (_) {}
  }
}

function detachUserEverywhere(app, userId) {
  var trainingslib = require(__hooks + '/trainingslib.js');
  trainingslib.withSkipBookingSideEffects(function () {
    removeFromMultiField(app, 'trainings', 'booked_users', userId);
    removeFromMultiField(app, 'trainings', 'attended_users', userId);
    removeFromMultiField(app, 'trainings', 'unbooked_users', userId);
    removeFromMultiField(app, 'trainings', 'moderator_kicked_users', userId);
    removeFromMultiField(app, 'trainings', 'restore_insufficient_users', userId);
  });

  removeFromMultiField(app, 'scheduled_broadcasts', 'recipients', userId);
  removeFromMultiField(app, 'scheduled_notifications', 'recipients', userId);
  removeFromTournamentParticipants(app, userId);

  // Личные / authored записи — физическое удаление
  deleteRecordsByField(app, 'comment_likes', 'author', userId);
  deleteRecordsByField(app, 'post_likes', 'user', userId);
  deleteRecordsByField(app, 'gallery_likes', 'user', userId);
  deleteRecordsByField(app, 'notifications', 'user', userId);
  deleteRecordsByField(app, 'content_views', 'user', userId);
  deleteRecordsByField(app, 'comments', 'author', userId);
  deleteRecordsByField(app, 'tournament_comments', 'author', userId);
  deleteRecordsByField(app, 'gallery_comments', 'author', userId);
  deleteRecordsByField(app, 'posts', 'author', userId);
  deleteRecordsByField(app, 'tournament_posts', 'author', userId);
  deleteRecordsByField(app, 'gallery', 'author', userId);
}

function logDeleteAudit(app, actor, user) {
  try {
    var audit = require(__hooks + '/auditlib.js');
    var subject = actor ? audit.actorInfo(actor) : null;
    if (subject) subject.source = 'moderator';
    var targetLabel = user.getString('full_name') || 'Игрок';
    var actorName = 'Модератор';
    if (subject && subject.label) {
      actorName = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }
    audit.logEvent(app, {
      category: 'profile',
      action: 'profile.user.delete',
      actionKind: 'delete',
      subject: subject,
      target: { id: user.id, label: targetLabel },
      objectType: 'user',
      objectId: user.id,
      objectLabel: targetLabel,
      details: {
        maxId: user.getString('max_id') || '',
        email: user.getString('email') || ''
      },
      summaryRu: actorName + ' удалил(а) аккаунт ' + targetLabel,
      severity: 'critical'
    });
  } catch (_) {}
}

/**
 * @param {*} app
 * @param {{ targetUserId: string, actor?: * }} opts
 * @returns {{ deletedUserId: string, fullName: string }}
 */
function deleteUserAccount(app, opts) {
  var targetUserId = String((opts && opts.targetUserId) || '');
  if (!targetUserId) {
    throw new BadRequestError('targetUserId обязателен');
  }

  var actor = opts && opts.actor;
  if (actor && String(actor.id) === targetUserId) {
    throw new BadRequestError('Нельзя удалить собственный аккаунт');
  }

  var user;
  try {
    user = app.findRecordById('users', targetUserId);
  } catch (_) {
    throw new NotFoundError('Пользователь не найден');
  }

  if (user.getString('role') === 'moderator') {
    throw new ForbiddenError('Нельзя удалить аккаунт модератора');
  }

  var fullName = user.getString('full_name') || 'Игрок';
  var deletedUserId = user.id;

  logDeleteAudit(app, actor, user);

  app.runInTransaction(function (txApp) {
    detachUserEverywhere(txApp, deletedUserId);
    var fresh = txApp.findRecordById('users', deletedUserId);
    txApp.delete(fresh);
  });

  return { deletedUserId: deletedUserId, fullName: fullName };
}

module.exports = {
  deleteUserAccount: deleteUserAccount
};
