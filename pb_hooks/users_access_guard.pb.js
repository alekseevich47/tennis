// Field-level ACL users (allow-list для обычного user).
// Guard должен выполняться первым и иметь право throw до записи.
// Логика в users_access_guard_lib.js — require внутри хендлеров (изоляция JSVM).
// Superuser (Admin UI /_/) и moderator обходят field-level ACL;
// обычный user — только SELF_EDITABLE_ALWAYS + исключения онбординга.

onRecordCreateRequest((e) => {
  var guard = require(__hooks + '/users_access_guard_lib.js');
  if (!guard.isPrivilegedAuth(e)) {
    guard.applyCreateDefaults(e.record);
  }
  if (!guard.isSuperuserAuth(e)) {
    // tg_id выставляют только tg-auth / claim ($app.save, не через API).
    e.record.set('tg_id', '');
    e.record.set('tg_bot_blocked', false);
    e.record.set('tg_bot_blocked_at', '');
    e.record.set('max_bot_blocked', false);
  }
  e.next();
}, 'users');

onRecordUpdateRequest((e) => {
  try {
    var guard = require(__hooks + '/users_access_guard_lib.js');
    var original = e.record.original();
    if (!guard.isPrivilegedAuth(e)) {
      if (!original) {
        e.next();
        return;
      }
      guard.assertPrivilegedUpdateAllowed(original, e.record);
      // freeze/stop log и т.п. в IGNORE — явный запрет lifecycle PATCH.
      guard.assertMembershipLifecycleFieldsUnchanged(original, e.record);
    } else if (!guard.isSuperuserAuth(e)) {
      // moderator: tg_id / флаги каналов — только через claim/webhook ($app.save).
      // freeze/stop — только /api/membership-freeze|stop ($app.save).
      if (original) {
        guard.assertServerOnlyFieldsUnchanged(original, e.record);
        guard.assertMembershipLifecycleFieldsUnchanged(original, e.record);
        guard.maybeResetFreezeBudgetOnStartDateChange(original, e.record);
        guard.maybeApplyMembershipEditSideEffects(original, e.record, e.auth);
      }
    } else if (original) {
      guard.maybeResetFreezeBudgetOnStartDateChange(original, e.record);
      guard.maybeApplyMembershipEditSideEffects(original, e.record, e.auth);
    }
    e.next();
  } catch (err) {
    var status = err && err.status;
    if (status >= 400 && status < 600) throw err;
    console.log('[users-access-guard] ' + err);
    throw new BadRequestError('users access guard: ' + (err.message || String(err)));
  }
}, 'users');
