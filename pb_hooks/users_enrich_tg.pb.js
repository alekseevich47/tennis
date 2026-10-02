// users.tg_id — hidden в схеме (не отдаётся в API и realtime).
// Модератору показываем (claim / привязка Telegram в ProfileViewModal).
// Superuser видит hidden-поля и без этого хука.
onRecordEnrich((e) => {
  try {
    const auth = e.requestInfo && e.requestInfo.auth;
    if (auth && auth.collection().name === 'users' && auth.getString('role') === 'moderator') {
      e.record.unhide('tg_id');
    }
  } catch (err) {
    console.log('[users-enrich-tg] ' + err);
  }
  e.next();
}, 'users');
