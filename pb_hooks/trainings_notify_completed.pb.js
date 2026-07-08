// In-app уведомление «Тренировка завершена» после окончания слота (date + duration).
cronAdd('training_notify_completed', '* * * * *', () => {
  try {
    var lib = require(__hooks + '/notificationslib.js');
    var trainingslib = require(__hooks + '/trainingslib.js');
    var filter = 'completion_notified = false && is_cancelled = false && is_deleted = false';
    var trainings = $app.findRecordsByFilter('trainings', filter, '', 0, 0);
    var processed = 0;
    var i;
    var j;

    for (i = 0; i < trainings.length; i++) {
      var training = trainings[i];
      var dateStr = training.getString('date');
      var duration = training.getFloat('duration') || 0;
      if (!trainingslib.hasTimeRangeEnded(dateStr, duration)) continue;

      var trainingId = lib.relationId(training);
      var bookedUsers = training.get('booked_users') || [];
      for (j = 0; j < bookedUsers.length; j++) {
        lib.upsertTrainingNotification(bookedUsers[j], trainingId, 'completed');
      }

      training.set('completion_notified', true);
      $app.save(training);
      processed++;
    }

    if (processed > 0) {
      console.log('[notify-completed] cron: processed ' + processed + ' trainings');
    }
  } catch (err) {
    console.log('[notify-completed] cron: ' + err);
  }
});
