// Библиотека запуска backup-скриптов из админ-API.
// Вызывать только через require(__hooks + '/backuplib.js').

function scriptsDir() {
  var fromEnv = ($os.getenv('BACKUP_SCRIPTS_DIR') || '').trim();
  return fromEnv || '/opt/tennis/scripts';
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
 * Запускает скрипт через sudo -n в фоне (не блокирует HTTP).
 * @param {'db'|'media'} type
 */
function startBackup(type) {
  var resolved = resolveScript(type);
  // Пути фиксированные (не из user input). nohup — без зомби от cmd.start().
  var shellCmd =
    'nohup sudo -n ' +
    resolved.script +
    ' --force >>' +
    resolved.logFile +
    ' 2>&1 &';
  var cmd = $os.cmd('bash', '-c', shellCmd);
  try {
    cmd.run();
  } catch (err) {
    var message = err && err.message ? err.message : String(err);
    console.log('[backup] start failed (' + type + '): ' + message);
    var e = new Error(
      'Не удалось запустить бэкап. Проверьте sudoers и скрипты: ' + message
    );
    e.status = 500;
    throw e;
  }
  console.log('[backup] accepted type=' + type + ' script=' + resolved.script);
  return { success: true, accepted: true, type: type };
}

module.exports = {
  startBackup: startBackup,
  scriptsDir: scriptsDir
};
