// Ежедневные in-app поздравления с днём рождения (08:00 GMT+7 = 01:00 UTC).

cronAdd('birthday_notify', '0 1 * * *', () => {
  try {
    const lib = require(__hooks + '/birthdaylib.js');
    const result = lib.runBirthdayNotifications($app);
    if (result && result.skipped) {
      console.log('[birthday] skipped: ' + result.skipped);
      return;
    }
    console.log(
      '[birthday] celebrants=' +
        (result && result.celebrants != null ? result.celebrants : 0) +
        ' sent=' +
        (result && result.sent != null ? result.sent : 0)
    );
  } catch (err) {
    console.log('[birthday] cron: ' + (err && err.stack ? err.stack : err));
  }
});
