// In-app поздравления с днём рождения. Файл без .pb.js — require() из cron.
// Создание notifications только через $app.save (не клиентский create).

var GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
var LOCK_KEY = 'birthday_notify_lock';
var LOCK_TTL_MS = 30 * 60 * 1000;
var TEMPLATE_KEY = 'app.player_birthday';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initialFromName(name) {
  var trimmed = String(name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

/**
 * Календарный день YYYY-MM-DD в GMT+7.
 * @param {number} [dayOffset]
 * @returns {string}
 */
function getLocalDateString(dayOffset) {
  var offset = Number(dayOffset) || 0;
  var local = new Date(Date.now() + GMT7_OFFSET_MS);
  local.setUTCDate(local.getUTCDate() + offset);
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return local.getUTCFullYear() + '-' + pad(local.getUTCMonth() + 1) + '-' + pad(local.getUTCDate());
}

/**
 * MM-DD из PB date-поля (без TZ-сдвига года рождения).
 * @param {*} birth
 * @returns {string}
 */
function birthMonthDay(birth) {
  if (!birth) return '';
  var s = String(birth).trim();
  if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') {
    return s.slice(5, 10);
  }
  return '';
}

/**
 * @param {number} year
 * @returns {boolean}
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Целевые MM-DD для «сегодня» (29.02 → 28.02 в невисокосный год).
 * @param {string} todayYmd YYYY-MM-DD
 * @returns {Object.<string, boolean>}
 */
function targetMonthDays(todayYmd) {
  var year = Number(todayYmd.slice(0, 4));
  var md = todayYmd.slice(5, 10);
  var map = {};
  map[md] = true;
  if (md === '02-28' && !isLeapYear(year)) {
    map['02-29'] = true;
  }
  return map;
}

/**
 * @param {*} meta
 * @returns {Object|null}
 */
function parseMeta(meta) {
  if (!meta) return null;
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta);
    } catch (_) {
      return null;
    }
  }
  if (typeof meta === 'object') return meta;
  return null;
}

/**
 * HTML-чип `.post-mention--user` (контракт serializeMentionEl на клиенте).
 * @param {*} user
 * @returns {string}
 */
function buildUserMentionHtml(user) {
  var id = String(user.id || '').trim();
  var name = String(user.getString('full_name') || '').trim() || 'Участник';
  if (!id) return escapeHtml(name);

  var avatarUrl = String(user.getString('avatar_url') || '').trim();
  var safeId = escapeHtml(id);
  var safeName = escapeHtml(name);
  var avatarAttr = '';
  var avatarHtml =
    '<span class="post-mention__avatar post-mention__avatar--fallback">' +
    escapeHtml(initialFromName(name)) +
    '</span>';

  if (avatarUrl && /^(https?:\/\/|\/|data:image\/)/i.test(avatarUrl)) {
    var safeAvatar = escapeHtml(avatarUrl);
    avatarAttr = ' data-avatar="' + safeAvatar + '"';
    avatarHtml = '<img class="post-mention__avatar" src="' + safeAvatar + '" alt="">';
  }

  return (
    '<span class="post-mention post-mention--user" contenteditable="false" ' +
    'data-mention="user" data-user-id="' +
    safeId +
    '" data-name="' +
    safeName +
    '"' +
    avatarAttr +
    ' role="link" tabindex="0" aria-label="Профиль ' +
    safeName +
    '">' +
    avatarHtml +
    '<span class="post-mention__label">' +
    safeName +
    '</span></span>'
  );
}

/**
 * @param {string} fullName
 * @returns {string} HTML-escaped first name
 */
function firstNameEscaped(fullName) {
  var parts = String(fullName || '')
    .trim()
    .split(/\s+/);
  var first = parts[0] || 'друг';
  return escapeHtml(first);
}

/**
 * @param {*} app
 * @param {string} recipientId
 * @param {string} birthdayUserId
 * @param {number} year
 * @returns {boolean}
 */
function hasBirthdayNotification(app, recipientId, birthdayUserId, year) {
  var list = app.findRecordsByFilter(
    'notifications',
    'recipient = "' + recipientId + '"',
    '-created',
    100,
    0
  );
  var i;
  for (i = 0; i < list.length; i++) {
    var meta = parseMeta(list[i].get('meta'));
    if (!meta || meta.kind !== 'player_birthday') continue;
    if (String(meta.birthdayUserId || '') !== String(birthdayUserId)) continue;
    if (Number(meta.year) !== Number(year)) continue;
    return true;
  }
  return false;
}

/**
 * @param {*} app
 * @returns {{ celebrants: Array, recipients: Array, todayYmd: string, year: number }|null}
 */
function collectAudience(app) {
  var todayYmd = getLocalDateString(0);
  var year = Number(todayYmd.slice(0, 4));
  var targets = targetMonthDays(todayYmd);

  var withBirth = app.findRecordsByFilter(
    'users',
    'birth_date != "" && is_banned != true && is_visible = true',
    '',
    0,
    0
  );
  var celebrants = [];
  var i;
  for (i = 0; i < withBirth.length; i++) {
    var md = birthMonthDay(withBirth[i].get('birth_date'));
    if (md && targets[md]) {
      celebrants.push(withBirth[i]);
    }
  }

  var recipients = app.findRecordsByFilter('users', 'is_banned != true', '', 0, 0);
  return { celebrants: celebrants, recipients: recipients, todayYmd: todayYmd, year: year };
}

/**
 * @param {*} app
 * @param {*} celebrant
 * @param {string} recipientId
 * @param {{ title: string, body: string }} resolved
 * @param {number} year
 */
function createBirthdayNotification(app, celebrant, recipientId, resolved, year) {
  var birthdayUserId = String(celebrant.id);
  if (hasBirthdayNotification(app, recipientId, birthdayUserId, year)) {
    return false;
  }

  var col = app.findCollectionByNameOrId('notifications');
  var n = new Record(col);
  n.set('recipient', recipientId);
  n.set('title', resolved.title || 'День рождения!');
  n.set('body', resolved.body || '');
  n.set('is_read', false);
  n.set('meta', {
    kind: 'player_birthday',
    birthdayUserId: birthdayUserId,
    year: year
  });
  app.save(n);
  return true;
}

/**
 * Ежедневный fan-out in-app поздравлений.
 * @param {*} app
 * @returns {{ sent: number, celebrants: number }}
 */
function runBirthdayNotifications(app) {
  var st = app.store();
  var started = Number(st.get(LOCK_KEY) || 0);
  if (started && Date.now() - started < LOCK_TTL_MS) {
    return { sent: 0, celebrants: 0, skipped: 'lock' };
  }
  st.set(LOCK_KEY, Date.now());

  var sent = 0;
  var celebrantCount = 0;
  try {
    var tpl = require(__hooks + '/templatelib.js');
    // Gate: если шаблон выключен — resolve вернёт null на первой попытке;
    // проверяем заранее без подстановки HTML.
    var gate = tpl.resolve(app, TEMPLATE_KEY, { player: '', first_name: '' });
    if (!gate) {
      return { sent: 0, celebrants: 0, skipped: 'disabled' };
    }

    var audience = collectAudience(app);
    celebrantCount = audience.celebrants.length;
    if (celebrantCount === 0 || audience.recipients.length === 0) {
      return { sent: 0, celebrants: celebrantCount };
    }

    var c;
    var r;
    for (c = 0; c < audience.celebrants.length; c++) {
      var celebrant = audience.celebrants[c];
      var mentionHtml = buildUserMentionHtml(celebrant);
      var firstName = firstNameEscaped(celebrant.getString('full_name'));
      var resolved = tpl.resolve(app, TEMPLATE_KEY, {
        player: mentionHtml,
        first_name: firstName
      });
      if (!resolved) continue;

      for (r = 0; r < audience.recipients.length; r++) {
        try {
          if (
            createBirthdayNotification(
              app,
              celebrant,
              audience.recipients[r].id,
              resolved,
              audience.year
            )
          ) {
            sent += 1;
          }
        } catch (err) {
          console.log(
            '[birthday] notify ' +
              celebrant.id +
              ' → ' +
              audience.recipients[r].id +
              ': ' +
              (err && err.stack ? err.stack : err)
          );
        }
      }
    }

    return { sent: sent, celebrants: celebrantCount };
  } finally {
    st.remove(LOCK_KEY);
  }
}

module.exports = {
  escapeHtml: escapeHtml,
  getLocalDateString: getLocalDateString,
  birthMonthDay: birthMonthDay,
  buildUserMentionHtml: buildUserMentionHtml,
  runBirthdayNotifications: runBirthdayNotifications
};
