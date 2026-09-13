// Freeze notifications.recipient on update (Strix LOW: BOLA reassignment).
// Schema updateRule also blocks body recipient change; hook is defense in depth.

onRecordUpdateRequest((e) => {
  try {
    var original = e.record.original();
    if (!original) {
      e.next();
      return;
    }
    var auth = e.auth;
    var isMod = auth && auth.getString && auth.getString('role') === 'moderator';
    if (!isMod) {
      e.record.set('recipient', original.get('recipient'));
    }
    e.next();
  } catch (err) {
    console.log('[notifications-recipient] ' + err);
    throw err;
  }
}, 'notifications');
