// Lifecycle абонементов: freeze (бюджет 30д) / stop / expiry. require() из хуков.

var FREEZE_BUDGET_DAYS = 30;
var FREEZE_MAX_MS = FREEZE_BUDGET_DAYS * 24 * 60 * 60 * 1000;
var WARN_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;
var DAY_MS = 24 * 60 * 60 * 1000;
var GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

function parsePbDate(str) {
  if (!str) return null;
  return new Date(String(str).replace(' ', 'T'));
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function toDateKeyGmt7(date) {
  var shifted = new Date(date.getTime() + GMT7_OFFSET_MS);
  var y = shifted.getUTCFullYear();
  var m = pad2(shifted.getUTCMonth() + 1);
  var d = pad2(shifted.getUTCDate());
  return y + '-' + m + '-' + d;
}

function gmt7Hour(date) {
  var shifted = new Date(date.getTime() + GMT7_OFFSET_MS);
  return shifted.getUTCHours();
}

function formatDayMonthBoldRu(date) {
  var months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  var shifted = new Date(date.getTime() + GMT7_OFFSET_MS);
  var day = shifted.getUTCDate();
  var month = months[shifted.getUTCMonth()] || '';
  return day + ' ' + month;
}

function formatDateTimeGmt7(isoOrDate) {
  var bot = require(__hooks + '/botlib.js');
  if (isoOrDate instanceof Date) {
    return bot.formatDateTimeGmt7(isoOrDate.toISOString());
  }
  return bot.formatDateTimeGmt7(isoOrDate);
}

function chargeFreezeDays(elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return 1;
  return Math.max(1, Math.ceil(elapsedMs / DAY_MS));
}

function getFreezeUsedDays(user) {
  if (user && user.getFloat) {
    return Math.max(0, Math.floor(Number(user.getFloat('membership_freeze_used_days')) || 0));
  }
  return Math.max(0, Math.floor(Number(user && user.membership_freeze_used_days) || 0));
}

function remainingFreezeDays(user) {
  return Math.max(0, FREEZE_BUDGET_DAYS - getFreezeUsedDays(user));
}

/** Обычный Error — BadRequestError из lib в goja часто обходит try/catch роутера. */
function fail(msg) {
  throw new Error(String(msg || 'membership error'));
}

function parseFreezeLogString(asString) {
  try {
    if (!asString || asString === 'null' || asString === '[]') return [];
    var log = JSON.parse(asString);
    if (!Array.isArray(log)) return [];
    var out = [];
    var i;
    for (i = 0; i < log.length; i++) {
      var e = log[i];
      if (!e || typeof e !== 'object') continue;
      var entry = {
        kind: e.kind ? String(e.kind) : 'freeze',
        frozen_at: e.frozen_at ? String(e.frozen_at) : '',
        unfrozen_at: e.unfrozen_at ? String(e.unfrozen_at) : ''
      };
      if (e.days_charged != null && e.days_charged !== '') {
        entry.days_charged = Number(e.days_charged);
      }
      if (e.planned_until) entry.planned_until = String(e.planned_until);
      if (e.by_id) entry.by_id = String(e.by_id);
      if (e.by_name) entry.by_name = String(e.by_name);
      out.push(entry);
    }
    return out;
  } catch (_) {
    return [];
  }
}

function serializeFreezeLog(log) {
  var plain = [];
  try {
    var i;
    for (i = 0; i < (log || []).length; i++) {
      var e = log[i] || {};
      var entry = {
        kind: e.kind ? String(e.kind) : 'freeze',
        frozen_at: e.frozen_at ? String(e.frozen_at) : '',
        unfrozen_at: e.unfrozen_at ? String(e.unfrozen_at) : ''
      };
      if (e.days_charged != null && e.days_charged !== '') {
        entry.days_charged = Number(e.days_charged);
      }
      if (e.planned_until) entry.planned_until = String(e.planned_until);
      if (e.by_id) entry.by_id = String(e.by_id);
      if (e.by_name) entry.by_name = String(e.by_name);
      plain.push(entry);
    }
  } catch (_) {
    plain = [];
  }
  return JSON.stringify(plain);
}

/**
 * findRecordById('users') в routerAdd на стенде зависает — только SQL.
 */
function loadUserRow(app, userId) {
  console.log('[membership] sql load ' + userId);
  var row = new DynamicModel({
    id: '',
    full_name: '',
    membership_type: '',
    membership_start_date: '',
    membership_end_date: '',
    membership_frozen: false,
    membership_frozen_at: '',
    membership_freeze_planned_until: '',
    membership_freeze_used_days: 0,
    membership_freeze_log: '',
    membership_stopped: false,
    membership_stopped_at: '',
    available_sessions: 0,
    used_sessions: 0,
    unpaid_sessions: 0,
    membership_comment: '',
    max_id: '',
    tg_id: '',
    tg_bot_blocked: false
  });
  try {
    app.db().newQuery(
      'SELECT id, full_name, membership_type, membership_start_date, membership_end_date, ' +
        'membership_frozen, membership_frozen_at, membership_freeze_planned_until, ' +
        'membership_freeze_used_days, membership_freeze_log, membership_stopped, membership_stopped_at, ' +
        'available_sessions, used_sessions, unpaid_sessions, membership_comment, ' +
        'max_id, tg_id, tg_bot_blocked ' +
        'FROM users WHERE id = {:id}'
    ).bind({ id: String(userId) }).one(row);
  } catch (err) {
    console.log('[membership] sql load err: ' + err);
    fail('Пользователь не найден');
  }
  console.log('[membership] sql load ok');
  return row;
}

function sqlExec(app, sql, bind, label) {
  try {
    console.log('[membership] sql ' + (label || 'exec'));
    app.db().newQuery(sql).bind(bind || {}).execute();
    console.log('[membership] sql ' + (label || 'exec') + ' ok');
  } catch (err) {
    console.log('[membership] sql ' + (label || 'exec') + ' err: ' + err);
    fail('Не удалось сохранить абонемент: ' + String(err));
  }
}

function trySqlFreezeLog(app, userId, currentLogStr, mutator, label) {
  try {
    var log = parseFreezeLogString(currentLogStr || '');
    mutator(log);
    sqlExec(
      app,
      'UPDATE users SET membership_freeze_log = {:log} WHERE id = {:id}',
      { log: serializeFreezeLog(log), id: String(userId) },
      'freeze_log_' + (label || '')
    );
  } catch (err) {
    console.log('[membership] freeze_log ' + (label || '') + ' skipped: ' + err);
  }
}

function rowAsUser(row) {
  return {
    id: row.id,
    getString: function (f) {
      var v = row[f];
      return v == null ? '' : String(v);
    },
    getBool: function (f) {
      return !!row[f];
    },
    getFloat: function (f) {
      return Number(row[f]) || 0;
    },
    get: function (f) {
      return row[f];
    }
  };
}

function snapshotFromRow(row) {
  return {
    id: row.id,
    membership_type: row.membership_type || 'regular',
    membership_start_date: row.membership_start_date || '',
    membership_end_date: row.membership_end_date || '',
    membership_frozen: !!row.membership_frozen,
    membership_frozen_at: row.membership_frozen_at || '',
    membership_freeze_planned_until: row.membership_freeze_planned_until || '',
    membership_freeze_used_days: Math.max(0, Math.floor(Number(row.membership_freeze_used_days) || 0)),
    membership_freeze_log: parseFreezeLogString(row.membership_freeze_log || ''),
    membership_stopped: !!row.membership_stopped,
    membership_stopped_at: row.membership_stopped_at || '',
    available_sessions: Number(row.available_sessions) || 0,
    used_sessions: Number(row.used_sessions) || 0,
    unpaid_sessions: Number(row.unpaid_sessions) || 0,
    membership_comment: row.membership_comment || ''
  };
}

function resolveUserId(opts) {
  if (opts && opts.targetUserId) return String(opts.targetUserId);
  if (opts && opts.target && opts.target.id) return String(opts.target.id);
  return '';
}

function addDaysToEndDateStr(endStr, days) {
  if (!days || days < 1 || !endStr) return endStr || '';
  var end = parsePbDate(endStr);
  if (!end || isNaN(end.getTime())) return endStr;
  end.setUTCDate(end.getUTCDate() + days);
  return end.toISOString().slice(0, 10);
}

function membershipType(user) {
  if (user && user.getString) return user.getString('membership_type') || 'regular';
  return (user && user.membership_type) || 'regular';
}

function canFreezeType(type) {
  return type === 'regular' || type === 'annual';
}

function canStopType(type) {
  return type === 'regular' || type === 'corporate' || type === 'annual';
}

function actorLabel(actor) {
  if (!actor) return 'Система';
  try {
    if (actor.getString) {
      return actor.getString('full_name') || 'Пользователь';
    }
  } catch (_) {}
  if (actor.label) {
    var idx = actor.label.indexOf(' (');
    return idx > -1 ? actor.label.slice(0, idx) : actor.label;
  }
  return 'Пользователь';
}

function actorId(actor) {
  if (!actor) return '';
  try {
    if (actor.id) return String(actor.id);
  } catch (_) {}
  return '';
}

function addDaysToEndDate(user, days) {
  if (!days || days < 1) return;
  var endStr = user.getString('membership_end_date');
  if (!endStr) return;
  var end = parsePbDate(endStr);
  if (!end || isNaN(end.getTime())) return;
  end.setUTCDate(end.getUTCDate() + days);
  user.set('membership_end_date', end.toISOString().slice(0, 10));
}

/**
 * Эффективный конец: membership_end_date + дни активной freeze/stop
 * (пока end ещё не продлён при unfreeze/start).
 */
function getEffectiveEndDate(user) {
  var endStr = user.getString('membership_end_date');
  var end = parsePbDate(endStr);
  if (!end || isNaN(end.getTime())) return null;

  var now = Date.now();
  if (user.getBool('membership_frozen')) {
    var frozenAt = parsePbDate(user.getString('membership_frozen_at'));
    var planned = parsePbDate(user.getString('membership_freeze_planned_until'));
    if (frozenAt && !isNaN(frozenAt.getTime())) {
      var capMs = FREEZE_MAX_MS;
      if (planned && !isNaN(planned.getTime())) {
        capMs = Math.min(capMs, Math.max(0, planned.getTime() - frozenAt.getTime()));
      }
      var frozenMs = Math.min(now - frozenAt.getTime(), capMs);
      var frozenDays = Math.max(0, Math.ceil(frozenMs / DAY_MS));
      end = new Date(end.getTime() + frozenDays * DAY_MS);
    }
  } else if (user.getBool('membership_stopped')) {
    var stoppedAt = parsePbDate(user.getString('membership_stopped_at'));
    if (stoppedAt && !isNaN(stoppedAt.getTime())) {
      var stopDays = Math.max(0, Math.ceil((now - stoppedAt.getTime()) / DAY_MS));
      end = new Date(end.getTime() + stopDays * DAY_MS);
    }
  }
  return end;
}

function sendBotToUser(app, user, templateKey, vars) {
  var tpl = require(__hooks + '/templatelib.js');
  var bot = require(__hooks + '/botlib.js');
  var resolved = tpl.resolve(app, templateKey, vars);
  if (!resolved || !resolved.body) return;
  bot.sendToUser(user, resolved.body);
}

function sendBotToModerators(app, templateKey, vars) {
  var tpl = require(__hooks + '/templatelib.js');
  var bot = require(__hooks + '/botlib.js');
  var resolved = tpl.resolve(app, templateKey, vars);
  if (!resolved || !resolved.body) return;
  bot.notifyModerators(resolved.body);
}

function createAppNotification(app, userId, templateKey, vars, extra) {
  var tpl = require(__hooks + '/templatelib.js');
  var resolved = tpl.resolve(app, templateKey, vars);
  if (!resolved) return;
  var col = app.findCollectionByNameOrId('notifications');
  var n = new Record(col);
  n.set('recipient', userId);
  n.set('title', resolved.title || '');
  n.set('body', resolved.body || '');
  if (extra && extra.badge_text != null) {
    n.set('badge_text', extra.badge_text);
  } else if (resolved.action_label) {
    n.set('badge_text', resolved.action_label);
  }
  if (extra && extra.click_action) {
    n.set('click_action', extra.click_action);
  } else {
    n.set('click_action', 'open_membership');
  }
  if (extra && extra.meta) {
    n.set('meta', extra.meta);
  }
  n.set('is_read', false);
  try {
    app.save(n);
  } catch (err) {
    console.log('[membership] notify save: ' + err);
  }
}

function notifyModsApp(app, templateKey, vars, extra) {
  var mods;
  try {
    mods = app.findRecordsByFilter('users', 'role = "moderator"', '', 0, 0);
  } catch (_) {
    return;
  }
  var i;
  for (i = 0; i < mods.length; i++) {
    createAppNotification(app, mods[i].id, templateKey, vars, extra);
  }
}

function logSubscriptionAudit(app, payload) {
  try {
    var audit = require(__hooks + '/auditlib.js');
    audit.logEvent(app, payload);
  } catch (err) {
    console.log('[membership] audit: ' + err);
  }
}

function userSnapshotFields(user) {
  if (user && !user.getString) return snapshotFromRow(user);
  var logStr = '';
  try {
    logStr = user.getString('membership_freeze_log') || '';
  } catch (_) {}
  return {
    id: user.id,
    membership_type: membershipType(user),
    membership_start_date: user.getString('membership_start_date') || '',
    membership_end_date: user.getString('membership_end_date') || '',
    membership_frozen: user.getBool('membership_frozen'),
    membership_frozen_at: user.getString('membership_frozen_at') || '',
    membership_freeze_planned_until: user.getString('membership_freeze_planned_until') || '',
    membership_freeze_used_days: getFreezeUsedDays(user),
    membership_freeze_log: parseFreezeLogString(logStr),
    membership_stopped: user.getBool('membership_stopped'),
    membership_stopped_at: user.getString('membership_stopped_at') || '',
    available_sessions: user.getFloat('available_sessions') || 0,
    used_sessions: user.getFloat('used_sessions') || 0,
    unpaid_sessions: user.getFloat('unpaid_sessions') || 0,
    membership_comment: user.getString('membership_comment') || ''
  };
}

/**
 * Сброс бюджета freeze при смене membership_start_date (вызов из access guard / API).
 */
function applyFreezeBudgetReset(record) {
  record.set('membership_freeze_used_days', 0);
  record.set('freeze_expiry_warn_for', '');
  record.set('freeze_tomorrow_warn_for', '');
}

function resetFreezeBudgetIfStartChanged(original, record) {
  if (!original || !record) return false;
  var a = String(original.getString('membership_start_date') || '');
  var b = String(record.getString('membership_start_date') || '');
  if (a === b) return false;
  applyFreezeBudgetReset(record);
  return true;
}

function freezeUser(app, opts) {
  opts = opts || {};
  var actor = opts.actor;
  var userId = resolveUserId(opts);
  console.log('[membership] freezeUser begin id=' + userId);
  if (!userId) fail('Пользователь не найден');

  var row = loadUserRow(app, userId);
  var type = row.membership_type || 'regular';
  if (!canFreezeType(type)) {
    fail('Заморозка доступна только для обычного и годового абонемента');
  }
  if (row.membership_stopped) fail('Абонемент остановлен. Сначала запустите абонемент.');
  if (row.membership_frozen) fail('Абонемент уже заморожен');
  var remaining = remainingFreezeDays(row);
  if (remaining < 1) fail('Лимит заморозки на этот абонемент исчерпан (30 дней)');

  var now = opts.now ? new Date(opts.now) : new Date();
  var frozenAtIso = now.toISOString();
  var plannedIso = new Date(now.getTime() + remaining * DAY_MS).toISOString();
  var name = row.full_name || 'Игрок';
  var actorName = actorLabel(actor);
  var fromLabel = formatDateTimeGmt7(frozenAtIso);
  var toLabel = formatDateTimeGmt7(plannedIso);
  var daysLabel = String(remaining);

  sqlExec(
    app,
    'UPDATE users SET membership_frozen = true, membership_frozen_at = {:frozenAt}, ' +
      'membership_freeze_planned_until = {:planned}, freeze_expiry_warn_for = \'\', ' +
      'freeze_tomorrow_warn_for = \'\' WHERE id = {:id}',
    { frozenAt: frozenAtIso, planned: plannedIso, id: userId },
    'freeze'
  );
  row.membership_frozen = true;
  row.membership_frozen_at = frozenAtIso;
  row.membership_freeze_planned_until = plannedIso;

  trySqlFreezeLog(app, userId, row.membership_freeze_log, function (log) {
    log.push({
      kind: 'freeze',
      frozen_at: frozenAtIso,
      unfrozen_at: '',
      planned_until: plannedIso,
      by_id: actorId(actor),
      by_name: actorName
    });
  }, 'freeze');

  var user = rowAsUser(row);
  var unbooked = [];
  try {
    unbooked = require(__hooks + '/trainingslib.js').unbookNotStartedForUser(app, userId, {
      cause: 'membership_freeze',
      actor: actor,
      userName: name
    }) || [];
  } catch (unbookErr) {
    console.log('[membership] freeze unbook: ' + unbookErr);
  }

  try {
    var varsUser = { days: daysLabel, from: fromLabel, to: toLabel };
    var varsMod = {
      name: name,
      days: daysLabel,
      from: fromLabel,
      to: toLabel,
      actor: actorName
    };
    sendBotToUser(app, user, 'bot.membership_freeze', varsUser);
    sendBotToModerators(app, 'bot.membership_freeze_mod', varsMod);
    createAppNotification(app, userId, 'app.membership_freeze', varsUser, {
      meta: { kind: 'membership_freeze' }
    });
    notifyModsApp(app, 'app.membership_freeze_mod', varsMod, {
      meta: { kind: 'membership_freeze', targetUserId: userId }
    });
  } catch (notifyErr) {
    console.log('[membership] freeze notify: ' + notifyErr);
  }

  var subject = null;
  try {
    var audit = require(__hooks + '/auditlib.js');
    subject = audit.actorInfo(actor);
    if (subject) subject.source = actorId(actor) === userId ? 'self' : 'moderator';
  } catch (_) {}
  logSubscriptionAudit(app, {
    category: 'subscription',
    action: 'subscription.freeze.set',
    actionKind: 'update',
    subject: subject,
    target: { id: userId, label: name },
    objectType: 'user',
    objectId: userId,
    objectLabel: name,
    effectiveAt: frozenAtIso,
    details: {
      days: remaining,
      plannedUntil: plannedIso,
      unbookedTrainingIds: unbooked,
      actorName: actorName
    },
    summaryRu: actorName + ' заморозил(а) абонемент ' + name + ' на ' + remaining + ' дн.',
    severity: 'info'
  });

  try {
    row = loadUserRow(app, userId);
  } catch (_) {}
  return snapshotFromRow(row);
}

function unfreezeUser(app, opts) {
  opts = opts || {};
  var actor = opts.actor;
  var reason = opts.reason || 'manual';
  var userId = resolveUserId(opts);
  console.log('[membership] unfreezeUser begin id=' + userId + ' reason=' + reason);
  if (!userId) fail('Пользователь не найден');

  var row = loadUserRow(app, userId);
  if (!row.membership_frozen) {
    if (reason === 'stop_override') return snapshotFromRow(row);
    fail('Абонемент не заморожен');
  }

  var frozenAt = parsePbDate(row.membership_frozen_at);
  var now = opts.now ? new Date(opts.now) : new Date();
  var elapsed = frozenAt && !isNaN(frozenAt.getTime())
    ? now.getTime() - frozenAt.getTime()
    : DAY_MS;
  var remaining = remainingFreezeDays(row);
  var days = Math.min(remaining, chargeFreezeDays(elapsed));
  if (days < 1) days = 1;

  var used = getFreezeUsedDays(row) + days;
  if (used > FREEZE_BUDGET_DAYS) {
    days = Math.max(0, FREEZE_BUDGET_DAYS - getFreezeUsedDays(row));
    used = FREEZE_BUDGET_DAYS;
  }

  var newEnd = addDaysToEndDateStr(row.membership_end_date, days);
  sqlExec(
    app,
    'UPDATE users SET membership_freeze_used_days = {:used}, membership_frozen = false, ' +
      'membership_frozen_at = \'\', membership_freeze_planned_until = \'\', ' +
      'freeze_expiry_warn_for = \'\', freeze_tomorrow_warn_for = \'\', ' +
      'membership_end_date = {:endDate} WHERE id = {:id}',
    { used: used, endDate: newEnd || row.membership_end_date || '', id: userId },
    'unfreeze'
  );
  row.membership_freeze_used_days = used;
  row.membership_frozen = false;
  row.membership_frozen_at = '';
  row.membership_freeze_planned_until = '';
  row.membership_end_date = newEnd || row.membership_end_date;

  trySqlFreezeLog(app, userId, row.membership_freeze_log, function (log) {
    if (log.length > 0) {
      var last = log[log.length - 1];
      if (last && !last.unfrozen_at) {
        last.unfrozen_at = now.toISOString();
        last.days_charged = days;
        if (!last.kind) last.kind = 'freeze';
      }
    }
  }, 'unfreeze');

  var name = row.full_name || 'Игрок';
  var actorName = actorLabel(actor);
  var user = rowAsUser(row);
  if (reason !== 'stop_override') {
    try {
      sendBotToUser(app, user, 'bot.membership_unfreeze', {});
      sendBotToModerators(app, 'bot.membership_unfreeze_mod', { name: name });
      createAppNotification(app, userId, 'app.membership_unfreeze', {}, {
        meta: { kind: 'membership_unfreeze' }
      });
      notifyModsApp(app, 'app.membership_unfreeze_mod', { name: name }, {
        meta: { kind: 'membership_unfreeze', targetUserId: userId }
      });
    } catch (notifyErr) {
      console.log('[membership] unfreeze notify: ' + notifyErr);
    }
  }

  var subject = null;
  try {
    var audit = require(__hooks + '/auditlib.js');
    subject = audit.actorInfo(actor);
    if (subject) {
      subject.source = reason === 'auto'
        ? 'system'
        : (actorId(actor) === userId ? 'self' : 'moderator');
    }
  } catch (_) {}
  logSubscriptionAudit(app, {
    category: 'subscription',
    action: 'subscription.freeze.unset',
    actionKind: 'update',
    subject: subject,
    subjectSource: reason === 'auto' ? 'system' : undefined,
    target: { id: userId, label: name },
    objectType: 'user',
    objectId: userId,
    objectLabel: name,
    details: {
      frozenDays: days,
      reason: reason,
      usedDays: used,
      actorName: actorName
    },
    summaryRu: reason === 'auto'
      ? 'Автоснятие заморозки абонемента ' + name + ' (' + days + ' дн.)'
      : actorName + ' разморозил(а) абонемент ' + name + ' (' + days + ' дн.)',
    severity: 'info'
  });

  try {
    row = loadUserRow(app, userId);
  } catch (_) {}
  return snapshotFromRow(row);
}

function stopUser(app, opts) {
  opts = opts || {};
  var actor = opts.actor;
  var userId = resolveUserId(opts);
  console.log('[membership] stopUser begin id=' + userId);
  if (!userId) fail('Пользователь не найден');

  var row = loadUserRow(app, userId);
  var type = row.membership_type || 'regular';
  if (!canStopType(type)) {
    fail('Остановка доступна для обычного, корпоративного и годового абонемента');
  }
  if (row.membership_stopped) fail('Абонемент уже остановлен');

  if (row.membership_frozen) {
    unfreezeUser(app, { targetUserId: userId, actor: actor, reason: 'stop_override' });
    row = loadUserRow(app, userId);
  }

  var now = opts.now ? new Date(opts.now) : new Date();
  var stoppedAtIso = now.toISOString();
  var name = row.full_name || 'Игрок';
  var actorName = actorLabel(actor);

  sqlExec(
    app,
    'UPDATE users SET membership_stopped = true, membership_stopped_at = {:at} WHERE id = {:id}',
    { at: stoppedAtIso, id: userId },
    'stop'
  );
  row.membership_stopped = true;
  row.membership_stopped_at = stoppedAtIso;

  trySqlFreezeLog(app, userId, row.membership_freeze_log, function (log) {
    log.push({
      kind: 'stop',
      frozen_at: stoppedAtIso,
      unfrozen_at: '',
      by_id: actorId(actor),
      by_name: actorName
    });
  }, 'stop');

  var user = rowAsUser(row);
  var unbooked = [];
  try {
    unbooked = require(__hooks + '/trainingslib.js').unbookNotStartedForUser(app, userId, {
      cause: 'membership_stop',
      actor: actor,
      userName: name
    }) || [];
  } catch (unbookErr) {
    console.log('[membership] stop unbook: ' + unbookErr);
  }

  try {
    var fromLabel = formatDateTimeGmt7(stoppedAtIso);
    var varsUser = { from: fromLabel };
    var varsMod = { name: name, from: fromLabel, actor: actorName };
    sendBotToUser(app, user, 'bot.membership_stop', varsUser);
    sendBotToModerators(app, 'bot.membership_stop_mod', varsMod);
    createAppNotification(app, userId, 'app.membership_stop', varsUser, {
      meta: { kind: 'membership_stop' }
    });
    notifyModsApp(app, 'app.membership_stop_mod', varsMod, {
      meta: { kind: 'membership_stop', targetUserId: userId }
    });
  } catch (notifyErr) {
    console.log('[membership] stop notify: ' + notifyErr);
  }

  var subject = null;
  try {
    var audit = require(__hooks + '/auditlib.js');
    subject = audit.actorInfo(actor);
    if (subject) subject.source = 'moderator';
  } catch (_) {}
  logSubscriptionAudit(app, {
    category: 'subscription',
    action: 'subscription.stop.set',
    actionKind: 'update',
    subject: subject,
    target: { id: userId, label: name },
    objectType: 'user',
    objectId: userId,
    objectLabel: name,
    effectiveAt: stoppedAtIso,
    details: { unbookedTrainingIds: unbooked, actorName: actorName },
    summaryRu: actorName + ' остановил(а) абонемент ' + name,
    severity: 'info'
  });

  try {
    row = loadUserRow(app, userId);
  } catch (_) {}
  return snapshotFromRow(row);
}

function startUser(app, opts) {
  opts = opts || {};
  var actor = opts.actor;
  var userId = resolveUserId(opts);
  console.log('[membership] startUser begin id=' + userId);
  if (!userId) fail('Пользователь не найден');

  var row = loadUserRow(app, userId);
  if (!row.membership_stopped) fail('Абонемент не остановлен');

  var stoppedAt = parsePbDate(row.membership_stopped_at);
  var now = opts.now ? new Date(opts.now) : new Date();
  var elapsed = stoppedAt && !isNaN(stoppedAt.getTime())
    ? now.getTime() - stoppedAt.getTime()
    : DAY_MS;
  var days = chargeFreezeDays(elapsed);
  var newEnd = addDaysToEndDateStr(row.membership_end_date, days);

  sqlExec(
    app,
    'UPDATE users SET membership_stopped = false, membership_stopped_at = \'\', ' +
      'membership_end_date = {:endDate} WHERE id = {:id}',
    { endDate: newEnd || row.membership_end_date || '', id: userId },
    'start'
  );
  row.membership_stopped = false;
  row.membership_stopped_at = '';
  row.membership_end_date = newEnd || row.membership_end_date;

  trySqlFreezeLog(app, userId, row.membership_freeze_log, function (log) {
    if (log.length > 0) {
      var last = log[log.length - 1];
      if (last && !last.unfrozen_at && last.kind === 'stop') {
        last.unfrozen_at = now.toISOString();
        last.days_charged = days;
      }
    }
  }, 'start');

  var name = row.full_name || 'Игрок';
  var actorName = actorLabel(actor);
  var user = rowAsUser(row);
  try {
    sendBotToUser(app, user, 'bot.membership_start', {});
    sendBotToModerators(app, 'bot.membership_start_mod', { name: name });
    createAppNotification(app, userId, 'app.membership_start', {}, {
      meta: { kind: 'membership_start' }
    });
    notifyModsApp(app, 'app.membership_start_mod', { name: name }, {
      meta: { kind: 'membership_start', targetUserId: userId }
    });
  } catch (notifyErr) {
    console.log('[membership] start notify: ' + notifyErr);
  }

  var subject = null;
  try {
    var audit = require(__hooks + '/auditlib.js');
    subject = audit.actorInfo(actor);
    if (subject) subject.source = 'moderator';
  } catch (_) {}
  logSubscriptionAudit(app, {
    category: 'subscription',
    action: 'subscription.stop.unset',
    actionKind: 'update',
    subject: subject,
    target: { id: userId, label: name },
    objectType: 'user',
    objectId: userId,
    objectLabel: name,
    details: { frozenDays: days, actorName: actorName },
    summaryRu: actorName + ' запустил(а) абонемент ' + name + ' (+' + days + ' дн.)',
    severity: 'info'
  });

  try {
    row = loadUserRow(app, userId);
  } catch (_) {}
  return snapshotFromRow(row);
}

function processFreezeWarnings(app) {
  var users = app.findRecordsByFilter(
    'users',
    'membership_frozen = true',
    '',
    0,
    0
  );
  var now = Date.now();
  var nowDate = new Date();
  var i;
  for (i = 0; i < users.length; i++) {
    var user = users[i];
    var planned = parsePbDate(user.getString('membership_freeze_planned_until'));
    if (!planned || isNaN(planned.getTime())) {
      var frozenAt = parsePbDate(user.getString('membership_frozen_at'));
      if (!frozenAt || isNaN(frozenAt.getTime())) continue;
      planned = new Date(frozenAt.getTime() + FREEZE_MAX_MS);
    }

    var msLeft = planned.getTime() - now;
    if (msLeft < 0) continue;

    var name = user.getString('full_name') || 'Игрок';
    var untilLabel = formatDateTimeGmt7(planned.toISOString());
    var plannedKey = toDateKeyGmt7(planned);
    var todayKey = toDateKeyGmt7(nowDate);
    var tomorrowKey = toDateKeyGmt7(new Date(nowDate.getTime() + DAY_MS));

    // −7 дней
    if (msLeft <= WARN_BEFORE_MS) {
      if (user.getString('freeze_expiry_warn_for') !== plannedKey) {
        sendBotToUser(app, user, 'bot.membership_freeze_warn_user', { until: untilLabel });
        sendBotToModerators(app, 'bot.membership_freeze_warn_mod', {
          name: name,
          until: untilLabel
        });
        createAppNotification(app, user.id, 'app.membership_freeze_warn', { until: untilLabel }, {
          meta: { kind: 'membership_freeze_warn' }
        });
        notifyModsApp(app, 'app.membership_freeze_warn_mod', {
          name: name,
          until: untilLabel
        }, { meta: { kind: 'membership_freeze_warn', targetUserId: user.id } });
        user.set('freeze_expiry_warn_for', plannedKey);
        app.save(user);
      }
    }

    // «Завтра» — календарный день GMT+7 до даты конца, с 08:00 GMT+7
    if (plannedKey === tomorrowKey && gmt7Hour(nowDate) >= 8) {
      if (user.getString('freeze_tomorrow_warn_for') !== plannedKey) {
        sendBotToUser(app, user, 'bot.membership_freeze_tomorrow_user', { until: untilLabel });
        sendBotToModerators(app, 'bot.membership_freeze_tomorrow_mod', {
          name: name,
          until: untilLabel
        });
        createAppNotification(app, user.id, 'app.membership_freeze_tomorrow', { until: untilLabel }, {
          meta: { kind: 'membership_freeze_tomorrow' }
        });
        notifyModsApp(app, 'app.membership_freeze_tomorrow_mod', {
          name: name,
          until: untilLabel
        }, { meta: { kind: 'membership_freeze_tomorrow', targetUserId: user.id } });
        try {
          user = app.findRecordById('users', user.id);
        } catch (_) {}
        user.set('freeze_tomorrow_warn_for', plannedKey);
        app.save(user);
      }
    }
  }
}

function processAutoUnfreeze(app) {
  var users = app.findRecordsByFilter(
    'users',
    'membership_frozen = true',
    '',
    0,
    0
  );
  var now = Date.now();
  var i;
  for (i = 0; i < users.length; i++) {
    try {
      var user = users[i];
      var planned = parsePbDate(user.getString('membership_freeze_planned_until'));
      if (!planned || isNaN(planned.getTime())) {
        var frozenAt = parsePbDate(user.getString('membership_frozen_at'));
        if (!frozenAt || isNaN(frozenAt.getTime())) continue;
        if (now - frozenAt.getTime() < FREEZE_MAX_MS) continue;
      } else if (now < planned.getTime()) {
        continue;
      }
      unfreezeUser(app, { targetUserId: user.id, actor: null, reason: 'auto' });
    } catch (err) {
      console.log('[membership] auto-unfreeze: ' + err);
    }
  }
}

function processExpiryWarnings(app) {
  var users = app.findRecordsByFilter(
    'users',
    'membership_type != "one_time" && membership_end_date != ""',
    '',
    0,
    0
  );
  var now = Date.now();
  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    var type = membershipType(user);
    if (type === 'one_time') continue;
    var effectiveEnd = getEffectiveEndDate(user);
    if (!effectiveEnd) continue;

    var msLeft = effectiveEnd.getTime() - now;
    if (msLeft > WARN_BEFORE_MS || msLeft < 0) continue;

    var warnKey = toDateKeyGmt7(effectiveEnd);
    if (user.getString('membership_expiry_warn_for') === warnKey) continue;

    var name = user.getString('full_name') || 'Игрок';
    var dateLabel = formatDayMonthBoldRu(effectiveEnd);
    sendBotToUser(app, user, 'bot.membership_expiry_warn_user', {});
    sendBotToModerators(app, 'bot.membership_expiry_warn_mod', {
      name: name,
      date: dateLabel
    });
    createAppNotification(app, user.id, 'app.membership_expiry_warn', {});
    user.set('membership_expiry_warn_for', warnKey);
    app.save(user);
  }
}

function processExpiryConvert(app) {
  var now = new Date();
  if (gmt7Hour(now) < 8) return;

  var todayKey = toDateKeyGmt7(now);
  var users = app.findRecordsByFilter(
    'users',
    'membership_type != "one_time" && membership_end_date != ""',
    '',
    0,
    0
  );

  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    var type = membershipType(user);
    if (type === 'one_time') continue;
    if (user.getBool('membership_frozen') || user.getBool('membership_stopped')) continue;
    var effectiveEnd = getEffectiveEndDate(user);
    if (!effectiveEnd) continue;

    var endKey = toDateKeyGmt7(effectiveEnd);
    if (endKey !== todayKey) continue;
    if (user.getString('membership_expired_notified_for') === endKey) continue;

    var prevAvailable = user.getFloat('available_sessions') || 0;
    user.set('membership_type', 'one_time');
    user.set('available_sessions', 0);
    user.set('membership_expired_notified_for', endKey);
    app.save(user);

    if (prevAvailable > 0) {
      try {
        require(__hooks + '/membershipledgerlib.js').logMovement(app, {
          userId: user.id,
          delta: -prevAvailable,
          kind: 'expired',
          actor: null,
          balanceAfter: 0
        });
      } catch (ledgerErr) {
        console.log('[membership] ledger expired: ' + ledgerErr);
      }
    }

    sendBotToUser(app, user, 'bot.membership_expired', {});
    var tpl = require(__hooks + '/templatelib.js');
    var resolved = tpl.resolve(app, 'app.membership_expired', {});
    createAppNotification(app, user.id, 'app.membership_expired', {}, {
      click_action: 'open_seller_chat',
      badge_text: resolved ? resolved.action_label : 'Продлить абонемент',
      meta: { kind: 'membership_expired', action_label: resolved ? resolved.action_label : 'Продлить абонемент' }
    });
  }
}

/** @deprecated use freezeUser — left for old route compatibility */
function notifyFreeze(app, userId) {
  try {
    var user = app.findRecordById('users', userId);
    sendBotToUser(app, user, 'bot.membership_freeze', {
      days: String(remainingFreezeDays(user) || FREEZE_BUDGET_DAYS),
      from: formatDateTimeGmt7(new Date().toISOString()),
      to: formatDateTimeGmt7(new Date(Date.now() + remainingFreezeDays(user) * DAY_MS).toISOString())
    });
  } catch (_) {}
}

function notifyTopUp(app, userId, count) {
  try {
    var user = app.findRecordById('users', userId);
    sendBotToUser(app, user, 'bot.membership_topup', { count: count });
    createAppNotification(app, userId, 'app.membership_topup', { count: count });
  } catch (_) {}
}

function runMembershipLifecycle(app) {
  try {
    var tpl = require(__hooks + '/templatelib.js');
    tpl.ensureSystemTemplates(app);
  } catch (_) {}
  processFreezeWarnings(app);
  processAutoUnfreeze(app);
  processExpiryWarnings(app);
  processExpiryConvert(app);
}

module.exports = {
  FREEZE_MAX_MS: FREEZE_MAX_MS,
  FREEZE_BUDGET_DAYS: FREEZE_BUDGET_DAYS,
  chargeFreezeDays: chargeFreezeDays,
  remainingFreezeDays: remainingFreezeDays,
  getEffectiveEndDate: getEffectiveEndDate,
  runMembershipLifecycle: runMembershipLifecycle,
  notifyFreeze: notifyFreeze,
  notifyTopUp: notifyTopUp,
  formatDayMonthBoldRu: formatDayMonthBoldRu,
  freezeUser: freezeUser,
  unfreezeUser: unfreezeUser,
  stopUser: stopUser,
  startUser: startUser,
  userSnapshotFields: userSnapshotFields,
  resetFreezeBudgetIfStartChanged: resetFreezeBudgetIfStartChanged,
  applyFreezeBudgetReset: applyFreezeBudgetReset,
  canFreezeType: canFreezeType,
  canStopType: canStopType
};
