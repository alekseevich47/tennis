// Field-level read ACL users: чужие приватные поля не отдаём в API/realtime.
// Логика в users_access_guard_lib.maskPrivateFieldsForViewer (require внутри хендлера).
// Паттерн как users_enrich_tg.pb.js (hide/unhide на onRecordEnrich).
// Superuser (Admin) — без маскировки. Owner и moderator видят полные поля.
// tg_id по-прежнему только moderator — users_enrich_tg.pb.js.

onRecordEnrich((e) => {
  try {
    var info = e.requestInfo;
    if (info && typeof info.hasSuperuserAuth === 'function' && info.hasSuperuserAuth()) {
      e.next();
      return;
    }

    var auth = info && info.auth;
    var viewerId = '';
    var isModerator = false;
    if (auth) {
      try {
        viewerId = String(auth.id || '');
      } catch (_) {
        viewerId = '';
      }
      try {
        isModerator =
          auth.collection &&
          auth.collection().name === 'users' &&
          auth.getString('role') === 'moderator';
      } catch (_) {
        isModerator = false;
      }
    }

    var guard = require(__hooks + '/users_access_guard_lib.js');
    guard.maskPrivateFieldsForViewer(e.record, viewerId, isModerator);
  } catch (err) {
    console.log('[users-field-visibility] ' + err);
  }
  e.next();
}, 'users');
