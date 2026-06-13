onRecordAuthRequest((e) => {
  if (e.record && e.record.getBool('is_banned')) {
    throw new ForbiddenError('Ваш аккаунт заблокирован');
  }
  e.next();
}, 'users');
