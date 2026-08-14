// Field-level защита привилегированных полей users.
// Имя файла раньше users_audit / users_ban_auth / users_default_visible —
// guard должен выполняться первым и иметь право throw до записи.
// Логика в users_access_guard_lib.js — require внутри хендлеров (изоляция JSVM).
// Superuser (Admin UI /_/) и moderator обходят field-level ACL;
// обычный user — только исключения онбординга в assertPrivilegedUpdateAllowed.

onRecordCreateRequest((e) => {
  var guard = require(__hooks + '/users_access_guard_lib.js');
  var isPrivileged =
    e.hasSuperuserAuth() ||
    !!(e.auth && e.auth.getString('role') === 'moderator');
  if (!isPrivileged) {
    guard.applyCreateDefaults(e.record);
  }
  e.next();
}, 'users');

onRecordUpdateRequest((e) => {
  try {
    var guard = require(__hooks + '/users_access_guard_lib.js');
    var isPrivileged =
      e.hasSuperuserAuth() ||
      !!(e.auth && e.auth.getString('role') === 'moderator');
    if (!isPrivileged) {
      var original = e.record.original();
      if (!original) {
        e.next();
        return;
      }
      guard.assertPrivilegedUpdateAllowed(original, e.record);
    }
    e.next();
  } catch (err) {
    var status = err && err.status;
    if (status >= 400 && status < 600) throw err;
    console.log('[users-access-guard] ' + err);
    throw new BadRequestError('users access guard: ' + (err.message || String(err)));
  }
}, 'users');
