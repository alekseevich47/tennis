// Claim / merge MAX: привязка max_id к ручному users и слияние дубля.
// Файл без .pb.js — require() внутри хендлеров.

function normalizeMaxId(value) {
  if (value == null) return '';
  return String(value).trim();
}

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

function replaceInIdList(ids, fromId, toId) {
  var result = [];
  var seen = {};
  var changed = false;
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i]);
    if (id === fromId) {
      changed = true;
      if (!seen[toId]) {
        result.push(toId);
        seen[toId] = true;
      }
      continue;
    }
    if (!seen[id]) {
      result.push(id);
      seen[id] = true;
    }
  }
  return { changed: changed, ids: result };
}

function findByMaxId(app, maxId) {
  try {
    return app.findFirstRecordByFilter('users', 'max_id = {:maxId}', { maxId: maxId });
  } catch (_) {
    return null;
  }
}

function remapSingleField(app, collection, field, fromId, toId, uniqueWithFields) {
  var records;
  try {
    records = app.findRecordsByFilter(
      collection,
      field + ' = {:fromId}',
      '',
      0,
      0,
      { fromId: fromId }
    );
  } catch (_) {
    return;
  }
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    if (uniqueWithFields && uniqueWithFields.length) {
      var conflictFilter = field + ' = {:toId}';
      var params = { toId: toId };
      for (var u = 0; u < uniqueWithFields.length; u++) {
        var uf = uniqueWithFields[u];
        conflictFilter += ' && ' + uf + ' = {:u' + u + '}';
        params['u' + u] = rec.getString(uf) || rec.get(uf);
      }
      try {
        app.findFirstRecordByFilter(collection, conflictFilter, params);
        app.delete(rec);
        continue;
      } catch (_) {}
    }
    rec.set(field, toId);
    app.save(rec);
  }
}

function remapMultiField(app, collection, field, fromId, toId) {
  var records;
  try {
    records = app.findRecordsByFilter(
      collection,
      field + ' ?= {:fromId}',
      '',
      0,
      0,
      { fromId: fromId }
    );
  } catch (_) {
    return;
  }
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var replaced = replaceInIdList(relationIds(rec.get(field)), fromId, toId);
    if (!replaced.changed) continue;
    rec.set(field, replaced.ids);
    app.save(rec);
  }
}

function remapTournamentParticipants(app, fromId, toId) {
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
      var copy = {};
      for (var k in row) {
        if (Object.prototype.hasOwnProperty.call(row, k)) copy[k] = row[k];
      }
      if (String(copy.userId || '') === fromId) {
        copy.userId = toId;
        changed = true;
      }
      next.push(copy);
    }
    if (!changed) continue;
    rec.set('participants', next);
    app.save(rec);
  }
}

function remapAuditTextIds(app, fromId, toId) {
  var fields = ['subject_id', 'target_id', 'object_id'];
  for (var f = 0; f < fields.length; f++) {
    var field = fields[f];
    var records;
    try {
      records = app.findRecordsByFilter(
        'audit_events',
        field + ' = {:fromId}',
        '',
        0,
        0,
        { fromId: fromId }
      );
    } catch (_) {
      continue;
    }
    for (var i = 0; i < records.length; i++) {
      records[i].set(field, toId);
      try {
        app.save(records[i]);
      } catch (_) {}
    }
  }
}

function mergeFavoriteProducts(target, stub) {
  var fromFavs = relationIds(stub.get('favorite_products'));
  var toFavs = relationIds(target.get('favorite_products'));
  var seen = {};
  var merged = [];
  var i;
  for (i = 0; i < toFavs.length; i++) {
    if (!seen[toFavs[i]]) {
      merged.push(toFavs[i]);
      seen[toFavs[i]] = true;
    }
  }
  for (i = 0; i < fromFavs.length; i++) {
    if (!seen[fromFavs[i]]) {
      merged.push(fromFavs[i]);
      seen[fromFavs[i]] = true;
    }
  }
  target.set('favorite_products', merged);
}

function copyStubFields(target, stub) {
  if (!(target.getString('avatar_url') || '') && (stub.getString('avatar_url') || '')) {
    target.set('avatar_url', stub.getString('avatar_url'));
  }
  if (stub.getBool('bot_blocked') && !target.getBool('bot_blocked')) {
    target.set('bot_blocked', true);
    target.set('bot_blocked_at', stub.get('bot_blocked_at') || '');
  }
  mergeFavoriteProducts(target, stub);
}

function remapAllFromStub(app, fromId, toId) {
  var trainingslib = require(__hooks + '/trainingslib.js');
  trainingslib.withSkipBookingSideEffects(function () {
    remapMultiField(app, 'trainings', 'booked_users', fromId, toId);
    remapMultiField(app, 'trainings', 'attended_users', fromId, toId);
    remapMultiField(app, 'trainings', 'unbooked_users', fromId, toId);
    remapMultiField(app, 'trainings', 'moderator_kicked_users', fromId, toId);
    remapMultiField(app, 'trainings', 'restore_insufficient_users', fromId, toId);
  });

  remapMultiField(app, 'scheduled_broadcasts', 'recipients', fromId, toId);
  remapMultiField(app, 'scheduled_notifications', 'recipients', fromId, toId);

  remapSingleField(app, 'posts', 'author', fromId, toId);
  remapSingleField(app, 'tournament_posts', 'author', fromId, toId);
  remapSingleField(app, 'gallery', 'author', fromId, toId);
  remapSingleField(app, 'comments', 'author', fromId, toId);
  remapSingleField(app, 'tournament_comments', 'author', fromId, toId);
  remapSingleField(app, 'gallery_comments', 'author', fromId, toId);
  remapSingleField(app, 'notifications', 'user', fromId, toId);
  remapSingleField(app, 'content_views', 'user', fromId, toId);
  remapSingleField(app, 'post_likes', 'user', fromId, toId, ['post']);
  remapSingleField(app, 'gallery_likes', 'user', fromId, toId, ['media_id']);
  remapSingleField(app, 'comment_likes', 'author', fromId, toId, ['comment']);

  remapTournamentParticipants(app, fromId, toId);
  remapAuditTextIds(app, fromId, toId);
}

/**
 * @param {core.App} app
 * @param {{ targetUserId: string, maxId?: string, maxUserId?: string, actor?: object }} opts
 * @returns {{ mode: 'link'|'merge', user: core.Record, deletedUserId?: string }}
 */
function claimMax(app, opts) {
  var targetUserId = String(opts.targetUserId || '');
  if (!targetUserId) {
    throw new BadRequestError('targetUserId обязателен');
  }

  var target;
  try {
    target = app.findRecordById('users', targetUserId);
  } catch (_) {
    throw new NotFoundError('Целевой пользователь не найден');
  }

  var maxId = normalizeMaxId(opts.maxId);
  var stub = null;

  if (opts.maxUserId) {
    try {
      stub = app.findRecordById('users', String(opts.maxUserId));
    } catch (_) {
      throw new NotFoundError('MAX-аккаунт не найден');
    }
    if (stub.id === target.id) {
      throw new BadRequestError('Нельзя привязать аккаунт к самому себе');
    }
    maxId = normalizeMaxId(stub.getString('max_id'));
    if (!maxId) {
      throw new BadRequestError('У выбранного аккаунта нет max_id');
    }
  }

  if (!maxId) {
    throw new BadRequestError('Укажите max_id или maxUserId');
  }

  var existingMax = normalizeMaxId(target.getString('max_id'));
  if (existingMax && existingMax !== maxId) {
    throw new BadRequestError('У игрока уже привязан другой max_id. Сначала отвяжите.');
  }
  if (existingMax === maxId && !stub) {
    return { mode: 'link', user: target };
  }

  var owner = findByMaxId(app, maxId);
  if (owner && owner.id === target.id && !stub) {
    return { mode: 'link', user: target };
  }

  // Вариант A: max_id свободен
  if (!owner && !stub) {
    target.set('max_id', maxId);
    app.save(target);
    logClaimAudit(app, opts.actor, target, 'link', maxId, null);
    return { mode: 'link', user: target };
  }

  // Вариант B: max_id занят другим пользователем (или явно передан maxUserId)
  if (!stub) {
    stub = owner;
  }
  if (!stub || stub.id === target.id) {
    throw new BadRequestError('Нечего объединять');
  }
  if (normalizeMaxId(stub.getString('max_id')) !== maxId) {
    throw new BadRequestError('max_id не совпадает с выбранным MAX-аккаунтом');
  }

  var deletedUserId = stub.id;

  app.runInTransaction(function (txApp) {
    remapAllFromStub(txApp, stub.id, target.id);

    target = txApp.findRecordById('users', targetUserId);
    stub = txApp.findRecordById('users', deletedUserId);

    copyStubFields(target, stub);

    stub.set('max_id', '');
    txApp.save(stub);

    target.set('max_id', maxId);
    txApp.save(target);

    txApp.delete(stub);
  });

  target = app.findRecordById('users', targetUserId);
  logClaimAudit(app, opts.actor, target, 'merge', maxId, deletedUserId);

  return { mode: 'merge', user: target, deletedUserId: deletedUserId };
}

function actorDisplayName(subject) {
  if (!subject || !subject.label) return 'Модератор';
  if (subject.label.indexOf(' (') > -1) {
    return subject.label.slice(0, subject.label.indexOf(' ('));
  }
  return subject.label;
}

function logClaimAudit(app, actor, user, mode, maxId, deletedUserId) {
  try {
    var audit = require(__hooks + '/auditlib.js');
    var subject = actor ? audit.actorInfo(actor) : null;
    if (subject) subject.source = 'moderator';
    var targetLabel = user.getString('full_name') || 'Игрок';
    var details = { mode: mode, maxId: maxId };
    if (deletedUserId) details.deletedUserId = deletedUserId;
    audit.logEvent(app, {
      category: 'profile',
      action: 'profile.max.claim',
      actionKind: 'update',
      subject: subject,
      target: { id: user.id, label: targetLabel },
      objectType: 'user',
      objectId: user.id,
      objectLabel: targetLabel,
      details: details,
      summaryRu:
        actorDisplayName(subject) +
        (mode === 'merge'
          ? ' объединил(а) MAX-аккаунт с профилем '
          : ' привязал(а) MAX к профилю ') +
        targetLabel,
      severity: mode === 'merge' ? 'warning' : 'info'
    });
  } catch (_) {}
}

/**
 * @param {core.App} app
 * @param {{ targetUserId: string, actor?: object }} opts
 */
function unclaimMax(app, opts) {
  var targetUserId = String(opts.targetUserId || '');
  var target;
  try {
    target = app.findRecordById('users', targetUserId);
  } catch (_) {
    throw new NotFoundError('Пользователь не найден');
  }
  var prev = normalizeMaxId(target.getString('max_id'));
  if (!prev) {
    return { user: target, maxId: '' };
  }
  target.set('max_id', '');
  app.save(target);

  try {
    var audit = require(__hooks + '/auditlib.js');
    var subject = opts.actor ? audit.actorInfo(opts.actor) : null;
    if (subject) subject.source = 'moderator';
    var targetLabel = target.getString('full_name') || 'Игрок';
    audit.logEvent(app, {
      category: 'profile',
      action: 'profile.max.unclaim',
      actionKind: 'update',
      subject: subject,
      target: { id: target.id, label: targetLabel },
      objectType: 'user',
      objectId: target.id,
      objectLabel: targetLabel,
      details: { maxId: prev },
      summaryRu:
        (subject && subject.label
          ? subject.label.indexOf(' (') > -1
            ? subject.label.slice(0, subject.label.indexOf(' ('))
            : subject.label
          : 'Модератор') +
        ' отвязал(а) MAX от профиля ' +
        targetLabel,
      severity: 'info'
    });
  } catch (_) {}

  return { user: target, maxId: prev };
}

/**
 * Кандидаты на merge (вариант B): пользователи с max_id.
 * @param {core.App} app
 * @param {string} excludeUserId
 * @returns {object[]}
 */
function listClaimCandidates(app, excludeUserId) {
  var filter = 'max_id != ""';
  var params = {};
  if (excludeUserId) {
    filter += ' && id != {:exclude}';
    params.exclude = excludeUserId;
  }
  var records = app.findRecordsByFilter('users', filter, '-created', 100, 0, params);
  var out = [];
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    out.push({
      id: r.id,
      full_name: r.getString('full_name') || '',
      max_id: r.getString('max_id') || '',
      avatar: r.get('avatar') || '',
      avatar_url: r.getString('avatar_url') || '',
      email: r.getString('email') || '',
      created: r.getString('created') || '',
      rating_points: r.getFloat('rating_points') || 0,
      available_sessions: r.getFloat('available_sessions') || 0
    });
  }
  return out;
}

function userToJson(user) {
  return {
    id: user.id,
    max_id: user.getString('max_id') || '',
    full_name: user.getString('full_name') || '',
    avatar_url: user.getString('avatar_url') || '',
    avatar: user.get('avatar') || '',
    role: user.getString('role') || 'user',
    bot_blocked: user.getBool('bot_blocked'),
    is_visible: user.getBool('is_visible'),
    is_banned: user.getBool('is_banned'),
    can_comment: user.getBool('can_comment'),
    rating_points: user.getFloat('rating_points') || 0,
    wins: user.getFloat('wins') || 0,
    available_sessions: user.getFloat('available_sessions') || 0,
    used_sessions: user.getFloat('used_sessions') || 0,
    attendance_count: user.getFloat('attendance_count') || 0,
    birth_date: user.get('birth_date') || '',
    dominant_hand: user.getString('dominant_hand') || '',
    section_start_date: user.get('section_start_date') || '',
    membership_type: user.getString('membership_type') || 'regular',
    membership_start_date: user.get('membership_start_date') || '',
    membership_end_date: user.get('membership_end_date') || '',
    membership_frozen: user.getBool('membership_frozen'),
    favorite_products: relationIds(user.get('favorite_products')),
    onboarding_completed: user.getBool('onboarding_completed'),
    name_set_in_onboarding: user.getBool('name_set_in_onboarding'),
    created: user.getString('created') || '',
    updated: user.getString('updated') || ''
  };
}

module.exports = {
  claimMax: claimMax,
  unclaimMax: unclaimMax,
  listClaimCandidates: listClaimCandidates,
  userToJson: userToJson,
  normalizeMaxId: normalizeMaxId
};
