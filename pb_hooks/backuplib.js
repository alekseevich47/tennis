// Библиотека запуска backup-скриптов из админ-API.
// Вызывать только через require(__hooks + '/backuplib.js').

function scriptsDir() {
  var fromEnv = ($os.getenv('BACKUP_SCRIPTS_DIR') || '').trim();
  return fromEnv || '/opt/tennis/scripts';
}

function notifyUrl() {
  return (
    ($os.getenv('BACKUP_NOTIFY_URL') || '').trim() ||
    'http://127.0.0.1:8090/api/internal/backup-notify'
  );
}

function notifyToken() {
  return ($os.getenv('BACKUP_NOTIFY_TOKEN') || '').trim();
}

function shellSingleQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

/**
 * @param {'db'|'media'} type
 * @returns {{ script: string, logFile: string }}
 */
function resolveScript(type) {
  var dir = scriptsDir();
  if (type === 'db') {
    return {
      script: $filepath.join(dir, 'backup_db_to_yandex.sh'),
      logFile: '/var/log/tennis-backup-db.log'
    };
  }
  if (type === 'media') {
    return {
      script: $filepath.join(dir, 'backup_storage_to_yandex.sh'),
      logFile: '/var/log/tennis-backup-media.log'
    };
  }
  var err = new Error('Invalid backup type');
  err.status = 400;
  throw err;
}

/**
 * @param {*} c echo context
 * @returns {boolean}
 */
function isLoopbackRequest(c) {
  var raw = '';
  try {
    if (c && typeof c.realIP === 'function') {
      raw = String(c.realIP() || '');
    }
  } catch (_) {}
  if (!raw) {
    try {
      var info = c.requestInfo();
      raw = String((info && (info.remoteIP || info.remoteAddr)) || '');
    } catch (_) {}
  }
  var s = String(raw || '')
    .trim()
    .toLowerCase();
  if (!s) return false;
  if (s.indexOf('127.0.0.1') === 0) return true;
  if (s === '::1' || s.indexOf('[::1]') === 0 || s.indexOf('::1:') === 0) return true;
  return false;
}

/**
 * In-app уведомления всем role=moderator о результате ручного бэкапа.
 * @param {core.App} app
 * @param {'db'|'media'} type
 * @param {boolean} ok
 * @returns {{ notified: number, type: string, ok: boolean }}
 */
function notifyModeratorsBackupResult(app, type, ok) {
  var label = type === 'media' ? 'медиа' : 'БД';
  var logHint = type === 'media' ? 'tennis-backup-media.log' : 'tennis-backup-db.log';
  var title = 'Секция Миленьких - Система';
  var body = ok
    ? 'Ручной бэкап ' + label + ' выполнен успешно.'
    : 'Ручной бэкап ' + label + ' завершился с ошибкой. Проверьте /var/log/' + logHint + '.';

  var mods = app.findRecordsByFilter('users', 'role = "moderator"', '', 0, 0);
  var collection = app.findCollectionByNameOrId('notifications');
  var notified = 0;
  var i;
  for (i = 0; i < mods.length; i++) {
    var mod = mods[i];
    if (!mod || !mod.id) continue;
    try {
      var notification = new Record(collection);
      notification.set('recipient', mod.id);
      notification.set('title', title);
      notification.set('body', body);
      notification.set('badge_text', ok ? 'Успех' : 'Ошибка');
      notification.set('is_read', false);
      notification.set('meta', {
        kind: 'backup_result',
        type: type,
        ok: !!ok
      });
      app.save(notification);
      notified += 1;
    } catch (err) {
      console.log(
        '[backup] notify moderator ' +
          mod.id +
          ': ' +
          (err && err.message ? err.message : String(err))
      );
    }
  }
  console.log(
    '[backup] in-app notify type=' + type + ' ok=' + ok + ' notified=' + notified
  );
  return { notified: notified, type: type, ok: !!ok };
}

/**
 * Запускает скрипт через sudo -n в фоне (не блокирует HTTP).
 * По завершении runner дергает /api/internal/backup-notify.
 * @param {'db'|'media'} type
 */
function startBackup(type) {
  var resolved = resolveScript(type);
  var runner = $filepath.join(scriptsDir(), 'admin_backup_runner.sh');
  var url = notifyUrl();
  var token = notifyToken();
  // Пути фиксированные (не из user input). nohup — без зомби от cmd.start().
  var shellCmd =
    'nohup env BACKUP_NOTIFY_TOKEN=' +
    shellSingleQuote(token) +
    ' bash ' +
    shellSingleQuote(runner) +
    ' ' +
    shellSingleQuote(type) +
    ' ' +
    shellSingleQuote(url) +
    ' >>' +
    resolved.logFile +
    ' 2>&1 &';
  var cmd = $os.cmd('bash', '-c', shellCmd);
  try {
    cmd.run();
  } catch (err) {
    var message = err && err.message ? err.message : String(err);
    console.log('[backup] start failed (' + type + '): ' + message);
    try {
      notifyModeratorsBackupResult($app, type, false);
    } catch (notifyErr) {
      console.log(
        '[backup] notify after start fail: ' +
          (notifyErr && notifyErr.message ? notifyErr.message : String(notifyErr))
      );
    }
    var e = new Error(
      'Не удалось запустить бэкап. Проверьте sudoers и скрипты: ' + message
    );
    e.status = 500;
    throw e;
  }
  console.log('[backup] accepted type=' + type + ' runner=' + runner);
  return { success: true, accepted: true, type: type };
}

module.exports = {
  startBackup: startBackup,
  scriptsDir: scriptsDir,
  isLoopbackRequest: isLoopbackRequest,
  notifyModeratorsBackupResult: notifyModeratorsBackupResult,
  notifyUrl: notifyUrl,
  notifyToken: notifyToken
};
