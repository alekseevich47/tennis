// In-app напоминание за ≤4 часа до тренировки (колокольчик, не MAX-бот).
// Одно уведомление на пару user+training; бейдж обновляется на клиенте каждую минуту.
cronAdd('training_reminder_4h', '* * * * *', () => {
  try {
    var lib = require(__hooks + '/notificationslib.js');
    var nowStr = lib.pbDateFilterStr(0);
    var fourHoursStr = lib.pbDateFilterStr(lib.FOUR_HOURS_MS);
    var filter =
      'date > "' +
      nowStr +
      '" && date <= "' +
      fourHoursStr +
      '" && is_deleted = false && is_cancelled = false';

    var trainings = $app.findRecordsByFilter('trainings', filter, 'date', 0, 0);
    var created = 0;
    var i;
    var j;

    for (i = 0; i < trainings.length; i++) {
      var training = trainings[i];
      var trainingId = lib.relationId(training);
      var bookedUsers = training.get('booked_users') || [];
      for (j = 0; j < bookedUsers.length; j++) {
        if (lib.upsertTrainingNotification(bookedUsers[j], trainingId, 'countdown')) created++;
      }
    }

    if (created > 0) {
      console.log('[reminder-4h] cron: upserted ' + created + ' notifications');
    }
  } catch (err) {
    console.log('[reminder-4h] cron: ' + err);
  }
});
