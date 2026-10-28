// Одноразовая ротация tokenKey у всех users (отзыв JWT после утечки MAX_BOT_TOKEN).
// Запуск ТОЛЬКО с env OPS_ROTATE_ALL_TOKEN_KEYS=1, затем убрать env и restart.
// Ops: после ротации bot token — см. локальный runbook / systemd override.

onBootstrap((e) => {
  e.next();

  var flag = $os.getenv('OPS_ROTATE_ALL_TOKEN_KEYS') || '';
  if (flag !== '1' && flag.toLowerCase() !== 'true' && flag.toLowerCase() !== 'yes') {
    return;
  }

  try {
    var users = $app.findRecordsByFilter('users', '', '', 0, 0) || [];
    var ok = 0;
    var fail = 0;
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      try {
        u.set('tokenKey', $security.randomString(50));
        $app.save(u);
        ok++;
      } catch (saveErr) {
        fail++;
        console.log('[ops-rotate-tokenKey] fail id=' + u.id + ': ' + saveErr);
      }
    }
    console.log(
      '[ops-rotate-tokenKey] DONE ok=' + ok + ' fail=' + fail +
        ' total=' + users.length +
        ' — СНИМИТЕ OPS_ROTATE_ALL_TOKEN_KEYS=1 и restart pocketbase'
    );
  } catch (err) {
    console.log('[ops-rotate-tokenKey] aborted: ' + err);
  }
});
