// Аудит входов (MAX / Telegram). Без .pb.js — require() внутри routerAdd.

function clip(str, max) {
  str = String(str == null ? '' : str);
  if (max > 0 && str.length > max) return str.slice(0, max);
  return str;
}

function clientMeta(body) {
  body = body || {};
  return {
    platform: clip(body.platform, 64),
    appVersion: clip(body.appVersion, 32),
    appBuild: clip(body.appBuild, 64)
  };
}

function clientIp(c) {
  try {
    if (c && typeof c.realIP === 'function') {
      var ip = c.realIP();
      if (ip) return String(ip);
    }
  } catch (_) {}
  try {
    if (c && typeof c.remoteIP === 'function') {
      var rip = c.remoteIP();
      if (rip) return String(rip);
    }
  } catch (_) {}
  return '';
}

function userAgent(c) {
  try {
    if (c && c.request && c.request.header) {
      var ua = c.request.header.get('User-Agent');
      if (ua) return clip(ua, 300);
    }
  } catch (_) {}
  try {
    var info = c.requestInfo();
    if (info && info.headers) {
      return clip(info.headers.user_agent || info.headers['User-Agent'] || '', 300);
    }
  } catch (_) {}
  return '';
}

var FAIL_SUMMARY = {
  missing_init_data: 'нет initData',
  auth_not_configured: 'сервер не настроен',
  invalid_signature: 'неверная подпись',
  auth_date_expired: 'устаревший initData',
  missing_user_data: 'нет данных пользователя',
  invalid_user_id: 'нет id пользователя',
  is_bot: 'бот',
  banned: 'аккаунт заблокирован',
  server_error: 'ошибка сервера'
};

/**
 * @param {*} app
 * @param {*} c RequestEvent (routerAdd)
 * @param {{
 *   channel: 'max'|'telegram',
 *   body?: object,
 *   action?: string,
 *   userId?: string,
 *   fullName?: string,
 *   maxId?: string,
 *   tgId?: string,
 *   firstNameRaw?: string,
 *   lastNameRaw?: string,
 *   isNewUser?: boolean,
 *   failReason?: string,
 *   summaryRu?: string
 * }} opts
 */
function logAuthAttempt(app, c, opts) {
  opts = opts || {};
  try {
    var audit = require(__hooks + '/auditlib.js');
    var meta = clientMeta(opts.body);
    var failReason = opts.failReason ? String(opts.failReason) : '';
    var action = opts.action || (failReason ? 'auth.denied' : opts.isNewUser ? 'auth.register' : 'auth.login');
    var isError = action === 'auth.denied' || !!failReason;

    var details = {
      channel: opts.channel || '',
      maxId: opts.maxId ? String(opts.maxId) : '',
      tgId: opts.tgId ? String(opts.tgId) : '',
      firstNameRaw: opts.firstNameRaw ? String(opts.firstNameRaw) : '',
      lastNameRaw: opts.lastNameRaw ? String(opts.lastNameRaw) : '',
      isNewUser: opts.isNewUser === true,
      ip: clientIp(c),
      userAgent: userAgent(c),
      platform: meta.platform,
      appVersion: meta.appVersion,
      appBuild: meta.appBuild
    };
    if (failReason) details.failReason = failReason;

    var subject = null;
    if (opts.userId) {
      subject = {
        id: opts.userId,
        label: opts.fullName || '',
        source: 'self'
      };
    }

    var summary = opts.summaryRu;
    if (!summary) {
      if (isError) {
        var reasonRu = FAIL_SUMMARY[failReason] || failReason || 'отказ';
        summary = 'Отказ во входе: ' + reasonRu;
      } else if (opts.isNewUser) {
        summary = 'Регистрация (первый вход)';
      } else {
        summary = 'Вход в приложение';
      }
    }

    audit.logEvent(app, {
      category: 'auth',
      action: action,
      actionKind: 'other',
      subject: subject,
      subjectSource: subject ? 'self' : 'system',
      objectType: 'user',
      objectId: opts.userId || '',
      objectLabel: opts.fullName || '',
      details: details,
      summaryRu: summary,
      severity: isError ? 'error' : 'info',
      isError: isError
    });
  } catch (err) {
    console.log('[auth_audit] ' + err);
  }
}

module.exports = {
  logAuthAttempt: logAuthAttempt,
  clientMeta: clientMeta,
  clientIp: clientIp,
  FAIL_SUMMARY: FAIL_SUMMARY
};
