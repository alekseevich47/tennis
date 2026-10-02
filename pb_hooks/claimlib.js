// Claim / merge мессенджеров (MAX + Telegram): привязка id к ручному users и слияние дубля.
// Файл без .pb.js — require() внутри хендлеров.

function normalizeMaxId(value) {
  if (value == null) return '';
  return String(value).trim();
}

/** Telegram user id — только положительное число. */
function normalizeTgId(value) {
  if (value == null) return '';
  var s = String(value).trim();
  return /^\d{1,20}$/.test(s) ? s : '';
}

/** Конфигурация каналов claim. Тексты MAX — без изменений (обратная совместимость UI). */
var CHANNELS = {
  max: {
    key: 'max',
    field: 'max_id',
    blockedField: 'max_bot_blocked',
    blockedAtField: '',
    detailsKey: 'maxId',
    auditPrefix: 'profile.max',
    normalize: normalizeMaxId,
    msg: {
      stubNotFound: 'MAX-аккаунт не найден',
      stubNoId: 'У выбранного аккаунта нет max_id',
      missingId: 'Укажите max_id или maxUserId',
      otherLinked: 'У игрока уже привязан другой max_id. Сначала отвяжите.',
      mismatch: 'max_id не совпадает с выбранным MAX-аккаунтом',
      linked: ' привязал(а) MAX к профилю ',
      merged: ' объединил(а) MAX-аккаунт с профилем ',
      unlinked: ' отвязал(а) MAX от профиля '
    }
  },
  tg: {
    key: 'tg',
    field: 'tg_id',
    blockedField: 'tg_bot_blocked',
    blockedAtField: 'tg_bot_blocked_at',
    detailsKey: 'tgId',
    auditPrefix: 'profile.tg',
    normalize: normalizeTgId,
    msg: {
      stubNotFound: 'Telegram-аккаунт не найден',
      stubNoId: 'У выбранного аккаунта нет tg_id',
      missingId: 'Укажите tg_id или tgUserId',
      otherLinked: 'У игрока уже привязан другой tg_id. Сначала отвяжите.',
      mismatch: 'tg_id не совпадает с выбранным Telegram-аккаунтом',
      linked: ' привязал(а) Telegram к профилю ',
      merged: ' объединил(а) Telegram-аккаунт с профилем ',
      unlinked: ' отвязал(а) Telegram от профиля '
    }
  }
};

function getChannel(key) {
  var ch = CHANNELS[key === 'tg' ? 'tg' : 'max'];
  return ch;
}

function recomputeBotBlocked(user) {
  try {
    var bot = require(__hooks + '/botlib.js');
    bot.recomputeBotBlocked(user);
  } catch (err) {
    console.log('[claim] recomputeBotBlocked: ' + err);
  }
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

function findByChannelId(app, ch, id) {
  try {
    return app.findFirstRecordByFilter('users', ch.field + ' = {:id}', { id: id });
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
  // bot_blocked — агрегат по каналам; пересчитывается после переноса id (recomputeBotBlocked).
  mergeFavoriteProducts(target, stub);
}

/**
 * Снимает с stub id всех мессенджеров (unique index) и возвращает список переносов.
 * Конфликт (у target другой id того же канала) → BadRequest (транзакция откатится).
 */
function detachStubMessengers(target, stub) {
  var transfers = [];
  var keys = ['max', 'tg'];
  for (var i = 0; i < keys.length; i++) {
    var ch = CHANNELS[keys[i]];
    var stubVal = ch.normalize(stub.getString(ch.field));
    if (!stubVal) continue;
    var targetVal = ch.normalize(target.getString(ch.field));
    if (targetVal && targetVal !== stubVal) {
      throw new BadRequestError(ch.msg.otherLinked);
    }
    transfers.push({
      ch: ch,
      value: stubVal,
      hadTarget: !!targetVal,
      blocked: stub.getBool(ch.blockedField),
      blockedAt: ch.blockedAtField ? stub.get(ch.blockedAtField) || '' : ''
    });
    stub.set(ch.field, '');
  }
  return transfers;
}

function applyMessengerTransfers(target, transfers) {
  for (var i = 0; i < transfers.length; i++) {
    var t = transfers[i];
    target.set(t.ch.field, t.value);
    if (!t.hadTarget) {
      target.set(t.ch.blockedField, t.blocked);
      if (t.ch.blockedAtField) target.set(t.ch.blockedAtField, t.blockedAt);
    }
  }
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
  remapSingleField(app, 'membership_ledger', 'user', fromId, toId);
  remapSingleField(app, 'post_likes', 'user', fromId, toId, ['post']);
  remapSingleField(app, 'gallery_likes', 'user', fromId, toId, ['media_id']);
  remapSingleField(app, 'comment_likes', 'author', fromId, toId, ['comment']);

  remapTournamentParticipants(app, fromId, toId);
  remapAuditTextIds(app, fromId, toId);
}

/**
 * Привязка (A) или слияние (B) аккаунта мессенджера.
 * @param {core.App} app
 * @param {'max'|'tg'} channelKey
 * @param {{ targetUserId: string, channelId?: string, stubUserId?: string, actor?: object }} opts
 * @returns {{ mode: 'link'|'merge', user: core.Record, deletedUserId?: string }}
 */
function claimMessenger(app, channelKey, opts) {
  var ch = getChannel(channelKey);
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

  var channelId = ch.normalize(opts.channelId);
  var stub = null;

  if (opts.stubUserId) {
    try {
      stub = app.findRecordById('users', String(opts.stubUserId));
    } catch (_) {
      throw new NotFoundError(ch.msg.stubNotFound);
    }
    if (stub.id === target.id) {
      throw new BadRequestError('Нельзя привязать аккаунт к самому себе');
    }
    channelId = ch.normalize(stub.getString(ch.field));
    if (!channelId) {
      throw new BadRequestError(ch.msg.stubNoId);
    }
  }

  if (!channelId) {
    throw new BadRequestError(ch.msg.missingId);
  }

  var existing = ch.normalize(target.getString(ch.field));
  if (existing && existing !== channelId) {
    throw new BadRequestError(ch.msg.otherLinked);
  }
  if (existing === channelId && !stub) {
    return { mode: 'link', user: target };
  }

  var owner = findByChannelId(app, ch, channelId);
  if (owner && owner.id === target.id && !stub) {
    return { mode: 'link', user: target };
  }

  // Вариант A: id свободен
  if (!owner && !stub) {
    target.set(ch.field, channelId);
    target.set(ch.blockedField, false);
    if (ch.blockedAtField) target.set(ch.blockedAtField, '');
    recomputeBotBlocked(target);
    app.save(target);
    logClaimAudit(app, ch, opts.actor, target, 'link', channelId, null);
    return { mode: 'link', user: target };
  }

  // Вариант B: id занят другим пользователем (или явно передан stubUserId)
  if (!stub) {
    stub = owner;
  }
  if (!stub || stub.id === target.id) {
    throw new BadRequestError('Нечего объединять');
  }
  if (ch.normalize(stub.getString(ch.field)) !== channelId) {
    throw new BadRequestError(ch.msg.mismatch);
  }

  var deletedUserId = stub.id;

  app.runInTransaction(function (txApp) {
    remapAllFromStub(txApp, stub.id, target.id);

    target = txApp.findRecordById('users', targetUserId);
    stub = txApp.findRecordById('users', deletedUserId);

    copyStubFields(target, stub);

    // Переносим id ВСЕХ мессенджеров stub (MAX и Telegram), сначала освобождая unique index.
    var transfers = detachStubMessengers(target, stub);
    txApp.save(stub);

    applyMessengerTransfers(target, transfers);
    recomputeBotBlocked(target);
    txApp.save(target);

    txApp.delete(stub);
  });

  target = app.findRecordById('users', targetUserId);
  logClaimAudit(app, ch, opts.actor, target, 'merge', channelId, deletedUserId);

  return { mode: 'merge', user: target, deletedUserId: deletedUserId };
}

/**
 * @param {core.App} app
 * @param {{ targetUserId: string, maxId?: string, maxUserId?: string, actor?: object }} opts
 * @returns {{ mode: 'link'|'merge', user: core.Record, deletedUserId?: string }}
 */
function claimMax(app, opts) {
  return claimMessenger(app, 'max', {
    targetUserId: opts.targetUserId,
    channelId: opts.maxId,
    stubUserId: opts.maxUserId,
    actor: opts.actor
  });
}

/**
 * @param {core.App} app
 * @param {{ targetUserId: string, tgId?: string, tgUserId?: string, actor?: object }} opts
 */
function claimTg(app, opts) {
  return claimMessenger(app, 'tg', {
    targetUserId: opts.targetUserId,
    channelId: opts.tgId,
    stubUserId: opts.tgUserId,
    actor: opts.actor
  });
}

function actorDisplayName(subject) {
  if (!subject || !subject.label) return 'Модератор';
  if (subject.label.indexOf(' (') > -1) {
    return subject.label.slice(0, subject.label.indexOf(' ('));
  }
  return subject.label;
}

function logClaimAudit(app, ch, actor, user, mode, channelId, deletedUserId) {
  try {
    var audit = require(__hooks + '/auditlib.js');
    var subject = actor ? audit.actorInfo(actor) : null;
    if (subject) subject.source = 'moderator';
    var targetLabel = user.getString('full_name') || 'Игрок';
    var details = { mode: mode };
    details[ch.detailsKey] = channelId;
    if (deletedUserId) details.deletedUserId = deletedUserId;
    audit.logEvent(app, {
      category: 'profile',
      action: ch.auditPrefix + '.claim',
      actionKind: 'update',
      subject: subject,
      target: { id: user.id, label: targetLabel },
      objectType: 'user',
      objectId: user.id,
      objectLabel: targetLabel,
      details: details,
      summaryRu:
        actorDisplayName(subject) +
        (mode === 'merge' ? ch.msg.merged : ch.msg.linked) +
        targetLabel,
      severity: mode === 'merge' ? 'warning' : 'info'
    });
  } catch (_) {}
}

/**
 * @param {core.App} app
 * @param {'max'|'tg'} channelKey
 * @param {{ targetUserId: string, actor?: object }} opts
 * @returns {{ user: core.Record, channelId: string }}
 */
function unclaimMessenger(app, channelKey, opts) {
  var ch = getChannel(channelKey);
  var targetUserId = String(opts.targetUserId || '');
  var target;
  try {
    target = app.findRecordById('users', targetUserId);
  } catch (_) {
    throw new NotFoundError('Пользователь не найден');
  }
  var prev = ch.normalize(target.getString(ch.field));
  if (!prev) {
    return { user: target, channelId: '' };
  }
  target.set(ch.field, '');
  target.set(ch.blockedField, false);
  if (ch.blockedAtField) target.set(ch.blockedAtField, '');
  recomputeBotBlocked(target);
  app.save(target);

  try {
    var audit = require(__hooks + '/auditlib.js');
    var subject = opts.actor ? audit.actorInfo(opts.actor) : null;
    if (subject) subject.source = 'moderator';
    var targetLabel = target.getString('full_name') || 'Игрок';
    var details = {};
    details[ch.detailsKey] = prev;
    audit.logEvent(app, {
      category: 'profile',
      action: ch.auditPrefix + '.unclaim',
      actionKind: 'update',
      subject: subject,
      target: { id: target.id, label: targetLabel },
      objectType: 'user',
      objectId: target.id,
      objectLabel: targetLabel,
      details: details,
      summaryRu: actorDisplayName(subject) + ch.msg.unlinked + targetLabel,
      severity: 'info'
    });
  } catch (_) {}

  return { user: target, channelId: prev };
}

/**
 * @param {core.App} app
 * @param {{ targetUserId: string, actor?: object }} opts
 */
function unclaimMax(app, opts) {
  var res = unclaimMessenger(app, 'max', opts);
  return { user: res.user, maxId: res.channelId };
}

/**
 * @param {core.App} app
 * @param {{ targetUserId: string, actor?: object }} opts
 */
function unclaimTg(app, opts) {
  var res = unclaimMessenger(app, 'tg', opts);
  return { user: res.user, tgId: res.channelId };
}

/**
 * Кандидаты на merge (вариант B): пользователи с id выбранного мессенджера.
 * @param {core.App} app
 * @param {string} excludeUserId
 * @param {'max'|'tg'} [channelKey]
 * @returns {object[]}
 */
function listClaimCandidates(app, excludeUserId, channelKey) {
  var ch = getChannel(channelKey);
  var filter = ch.field + ' != ""';
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
      tg_id: r.getString('tg_id') || '',
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
    tg_id: user.getString('tg_id') || '',
    full_name: user.getString('full_name') || '',
    avatar_url: user.getString('avatar_url') || '',
    avatar: user.get('avatar') || '',
    role: user.getString('role') || 'user',
    bot_blocked: user.getBool('bot_blocked'),
    max_bot_blocked: user.getBool('max_bot_blocked'),
    tg_bot_blocked: user.getBool('tg_bot_blocked'),
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
  claimTg: claimTg,
  unclaimTg: unclaimTg,
  listClaimCandidates: listClaimCandidates,
  userToJson: userToJson,
  normalizeMaxId: normalizeMaxId,
  normalizeTgId: normalizeTgId
};
