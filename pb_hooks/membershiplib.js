// Lifecycle абонементов: freeze max 30d, expiry warn/convert. require() из хуков.

var FREEZE_MAX_MS = 30 * 24 * 60 * 60 * 1000;
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

/**
 * Эффективный конец: membership_end_date + дни активной заморозки (cap 30),
 * если end ещё не продлён unfreeze (unfrozen_at отсутствует).
 */
function getEffectiveEndDate(user) {
  var endStr = user.getString('membership_end_date');
  var end = parsePbDate(endStr);
  if (!end || isNaN(end.getTime())) return null;

  if (user.getBool('membership_frozen')) {
    var frozenAt = parsePbDate(user.getString('membership_frozen_at'));
    if (frozenAt && !isNaN(frozenAt.getTime())) {
      var frozenMs = Math.min(Date.now() - frozenAt.getTime(), FREEZE_MAX_MS);
      var frozenDays = Math.max(0, Math.ceil(frozenMs / DAY_MS));
      end = new Date(end.getTime() + frozenDays * DAY_MS);
    }
  }
  return end;
}

function sendBotToUser(app, user, templateKey, vars) {
  var tpl = require(__hooks + '/templatelib.js');
  var bot = require(__hooks + '/botlib.js');
  var resolved = tpl.resolve(app, templateKey, vars);
  if (!resolved || !resolved.body) return;
  var maxId = user.getString('max_id');
  if (!maxId) return;
  bot.sendBotMessage(maxId, resolved.body);
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
  }
  if (extra && extra.meta) {
    n.set('meta', extra.meta);
  }
  n.set('is_read', false);
  app.save(n);
}

function autoUnfreezeUser(app, user) {
  var frozenAt = parsePbDate(user.getString('membership_frozen_at'));
  if (!frozenAt || isNaN(frozenAt.getTime())) return false;
  var now = Date.now();
  if (now - frozenAt.getTime() < FREEZE_MAX_MS) return false;

  var frozenDays = Math.min(30, Math.max(1, Math.ceil((now - frozenAt.getTime()) / DAY_MS)));
  var endStr = user.getString('membership_end_date');
  if (endStr) {
    var end = parsePbDate(endStr);
    if (end && !isNaN(end.getTime())) {
      end.setUTCDate(end.getUTCDate() + frozenDays);
      user.set('membership_end_date', end.toISOString().slice(0, 10));
    }
  }

  var log = user.get('membership_freeze_log') || [];
  if (typeof log === 'string') {
    try { log = JSON.parse(log); } catch (_) { log = []; }
  }
  if (!Array.isArray(log)) log = [];
  if (log.length > 0) {
    log[log.length - 1].unfrozen_at = new Date().toISOString();
  }
  user.set('membership_freeze_log', log);
  user.set('membership_frozen', false);
  user.set('membership_frozen_at', '');
  app.save(user);
  return true;
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
  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    var frozenAt = parsePbDate(user.getString('membership_frozen_at'));
    if (!frozenAt || isNaN(frozenAt.getTime())) continue;

    var freezeEnd = new Date(frozenAt.getTime() + FREEZE_MAX_MS);
    var msLeft = freezeEnd.getTime() - now;
    if (msLeft > WARN_BEFORE_MS || msLeft < 0) continue;

    var warnKey = toDateKeyGmt7(freezeEnd);
    if (user.getString('freeze_expiry_warn_for') === warnKey) continue;

    var name = user.getString('full_name') || 'Игрок';
    var dateLabel = formatDayMonthBoldRu(freezeEnd);
    sendBotToUser(app, user, 'bot.membership_freeze_warn_user', {});
    sendBotToModerators(app, 'bot.membership_freeze_warn_mod', {
      name: name,
      date: dateLabel
    });
    user.set('freeze_expiry_warn_for', warnKey);
    app.save(user);
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
  for (var i = 0; i < users.length; i++) {
    try {
      autoUnfreezeUser(app, users[i]);
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
    var type = user.getString('membership_type') || 'regular';
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
    var type = user.getString('membership_type') || 'regular';
    if (type === 'one_time') continue;
    var effectiveEnd = getEffectiveEndDate(user);
    if (!effectiveEnd) continue;

    var endKey = toDateKeyGmt7(effectiveEnd);
    if (endKey !== todayKey) continue;
    if (user.getString('membership_expired_notified_for') === endKey) continue;

    user.set('membership_type', 'one_time');
    user.set('available_sessions', 0);
    user.set('membership_expired_notified_for', endKey);
    app.save(user);

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

function notifyFreeze(app, userId) {
  try {
    var user = app.findRecordById('users', userId);
    sendBotToUser(app, user, 'bot.membership_freeze', {});
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
  getEffectiveEndDate: getEffectiveEndDate,
  runMembershipLifecycle: runMembershipLifecycle,
  notifyFreeze: notifyFreeze,
  notifyTopUp: notifyTopUp,
  formatDayMonthBoldRu: formatDayMonthBoldRu
};
