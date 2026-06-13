const USERS_COLLECTION = 'users';

onRecordAuthRequest((e) => {
  // Забаненный не может обновить сессию — принудительный разлогин
  if (e.record && e.record.getBool('is_banned')) {
    throw new ForbiddenError('Ваш аккаунт заблокирован');
  }
}, USERS_COLLECTION);
