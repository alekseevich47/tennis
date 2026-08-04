// Запрет auth / auth-refresh для забаненных + немедленная инвалидация
// выданных токенов при переходе is_banned false→true (ротация tokenKey).

onRecordAuthRequest((e) => {
  if (e.record && e.record.getBool('is_banned')) {
    throw new ForbiddenError('Ваш аккаунт заблокирован');
  }
  e.next();
}, 'users');

// POST /api/collections/users/auth-refresh — отдельный хук в PB 0.23+;
// onRecordAuthRequest его не покрывает.
onRecordAuthRefreshRequest((e) => {
  if (e.record && e.record.getBool('is_banned')) {
    throw new ForbiddenError('Ваш аккаунт заблокирован');
  }
  e.next();
}, 'users');

// После users_access_guard по алфавиту — модераторский бан уже разрешён guard'ом.
// Ротация tokenKey до e.next() гасит уже выданные JWT немедленно (не через 7 суток).
onRecordUpdateRequest((e) => {
  var original = e.record.original();
  if (original && !original.getBool('is_banned') && e.record.getBool('is_banned')) {
    e.record.set('tokenKey', $security.randomString(50));
  }
  e.next();
}, 'users');
