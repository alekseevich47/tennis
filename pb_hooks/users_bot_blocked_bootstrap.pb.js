// Миграция агрегата bot_blocked (MAX + Telegram).
// До Telegram bot_blocked означал «заблокирован бот MAX». Для пользователя без tg_id
// инвариант max_bot_blocked == bot_blocked верен всегда → синхронизация идемпотентна.
// e.next() строго первой строкой (до e.next() БД ещё не открыта).
onBootstrap((e) => {
  e.next();
  try {
    const users = $app.findRecordsByFilter(
      'users',
      'tg_id = "" && max_id != "" && bot_blocked = true && max_bot_blocked = false',
      '',
      0,
      0
    );
    for (let i = 0; i < users.length; i++) {
      users[i].set('max_bot_blocked', true);
      $app.save(users[i]);
    }
    if (users.length) {
      console.log('[bot] bootstrap: max_bot_blocked синхронизирован для ' + users.length + ' users');
    }
  } catch (err) {
    console.log('[bot] bootstrap max_bot_blocked skipped: ' + err);
  }
});
