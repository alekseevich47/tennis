// История посещений: ручное изменение available_sessions модератором (users → membership_ledger).
// Списания/возвраты при записи идут через trainingslib ($app.save → UpdateRequest не вызывается).

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var oldSessions = Number(original.getFloat('available_sessions')) || 0;
    var newSessions = Number(record.getFloat('available_sessions')) || 0;
    if (oldSessions === newSessions) return;

    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    if (!auth) return;

    var privileged = false;
    try {
      if (typeof auth.isSuperuser === 'function' && auth.isSuperuser()) privileged = true;
    } catch (_) {}
    try {
      if (auth.collection && auth.collection().name === '_superusers') privileged = true;
    } catch (_) {}
    try {
      if (auth.getString('role') === 'moderator') privileged = true;
    } catch (_) {}
    if (!privileged) return;

    var delta = newSessions - oldSessions;
    require(__hooks + '/membershipledgerlib.js').logMovement($app, {
      userId: record.id,
      delta: delta,
      kind: delta > 0 ? 'manual_add' : 'manual_subtract',
      actor: auth,
      balanceAfter: newSessions
    });
  } catch (err) {
    console.log('[users_membership_ledger] ' + err);
  }
}, 'users');
