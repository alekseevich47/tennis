// Библиотека запуска backup-скриптов из админ-API.
// Вызывать только через require(__hooks + '/backuplib.js').

var MANUAL_DIR = '/opt/tennis/backups/manual';
var MANUAL_LOG_DIR = '/opt/tennis/backups/logs';

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

function shellSingleQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function tokenPath(type) {
  return MANUAL_DIR + '/notify-' + type + '.token';
}

function manualLogFile(type) {
  return MANUAL_LOG_DIR + '/manual-' + type + '.log';
}

var TOKEN_FILE_MODE = parseInt('600', 8);

/** @returns {string} 48 hex chars */
function randomToken() {
  var hex = '0123456789abcdef';
  var out = '';
  var i;
  for (i = 0; i < 48; i++) {
    out += hex.charAt(Math.floor(Math.random() * 16));
  }
  return out;
}

/** @param {unknown} raw */
function bytesOrStringToText(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.length != null) {
    var s = '';
    var i;
    for (i = 0; i < raw.length; i++) {
      s += String.fromCharCode(Number(raw[i]) & 0xff);
    }
    return s;
  }
  return String(raw);
}

function ensureManualDirs() {
  $os.cmd(
    'bash',
    '-c',
    'mkdir -p ' + shellSingleQuote(MANUAL_DIR) + ' ' + shellSingleQuote(MANUAL_LOG_DIR)
  ).run();
}

/**
 * @param {'db'|'media'} type
 * @param {string} token
 */
function writeNotifyToken(type, token) {
  ensureManualDirs();
  // mode обязателен: без него JSVM пишет ---------- (000) → notify 403
  $os.writeFile(tokenPath(type), String(token), TOKEN_FILE_MODE);
  try {
    $os.chmod(tokenPath(type), TOKEN_FILE_MODE);
  } catch (_) {}
}

/**
 * One-shot: читает и удаляет токен. true если совпал.
 * @param {'db'|'media'} type
 * @param {string} got
 * @returns {boolean}
 */
function consumeNotifyToken(type, got) {
  var path = tokenPath(type);
  var expected = '';
  try {
    expected = bytesOrStringToText($os.readFile(path)).trim();
  } catch (_) {
    return false;
  }
  try {
    $os.remove(path);
  } catch (_) {}
  if (!expected || !got) return false;
  return String(got) === expected;
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
      logFile: manualLogFile('db')
    };
  }
  if (type === 'media') {
    return {
      script: $filepath.join(dir, 'backup_storage_to_yandex.sh'),
      logFile: manualLogFile('media')
    };
  }
  var err = new Error('Invalid backup type');
  err.status = 400;
  throw err;
}

/**
 * @param {core.App} app
 * @param {'db'|'media'} type
 * @param {boolean} ok
 * @returns {{ notified: number, type: string, ok: boolean }}
 */
function notifyModeratorsBackupResult(app, type, ok) {
  var label = type === 'media' ? 'медиа' : 'БД';
  var logHint = manualLogFile(type);
  var title = 'Секция Миленьких - Система';
  var body = ok
    ? 'Ручной бэкап ' + label + ' выполнен успешно.'
    : 'Ручной бэкап ' + label + ' завершился с ошибкой. Лог: ' + logHint;

  var mods = app.findRecordsByFilter('users', 'role = "moderator"', '', 200, 0);
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
 * Лог — в /opt/tennis/backups/logs (доступен пользователю pocketbase).
 * По завершении runner дергает /api/internal/backup-notify с one-shot токеном.
 * @param {'db'|'media'} type
 */
function startBackup(type) {
  var resolved = resolveScript(type);
  var runner = $filepath.join(scriptsDir(), 'admin_backup_runner.sh');
  var url = notifyUrl();
  var token = randomToken();
  writeNotifyToken(type, token);

  // mkdir + nohup: не пишем в /var/log (часто root-only → джоба умирает молча).
  var shellCmd =
    'mkdir -p ' +
    shellSingleQuote(MANUAL_LOG_DIR) +
    ' ' +
    shellSingleQuote(MANUAL_DIR) +
    ' && nohup env BACKUP_NOTIFY_TOKEN=' +
    shellSingleQuote(token) +
    ' bash ' +
    shellSingleQuote(runner) +
    ' ' +
    shellSingleQuote(type) +
    ' ' +
    shellSingleQuote(url) +
    ' >>' +
    shellSingleQuote(resolved.logFile) +
    ' 2>&1 &';
  var cmd = $os.cmd('bash', '-c', shellCmd);
  try {
    cmd.run();
  } catch (err) {
    var message = err && err.message ? err.message : String(err);
    console.log('[backup] start failed (' + type + '): ' + message);
    try {
      $os.remove(tokenPath(type));
    } catch (_) {}
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
  console.log(
    '[backup] accepted type=' + type + ' runner=' + runner + ' log=' + resolved.logFile
  );
  return { success: true, accepted: true, type: type };
}

module.exports = {
  startBackup: startBackup,
  scriptsDir: scriptsDir,
  consumeNotifyToken: consumeNotifyToken,
  notifyModeratorsBackupResult: notifyModeratorsBackupResult,
  notifyUrl: notifyUrl,
  manualLogFile: manualLogFile
};
