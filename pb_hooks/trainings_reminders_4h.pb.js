// In-app напоминание за ~4 часа до тренировки (колокольчик, не MAX-бот).
// Окно 3h55m..4h05m от @now — крон каждые 5 минут перекрывает ±5 мин.
cronAdd('training_reminder_4h', '*/5 * * * *', () => {
  const TITLE = 'Не забыли? 😜';
  const BODY =
    'А мы напоминаем, совсем скоро у Вас запланирована тренировка! Мы Вас будем ждать! Но если что-то пошло не по плану, обязательно сообщите нам.';

  try {
    // PB хранит date как "YYYY-MM-DD HH:mm:ss.000Z"; @now + strftime — тот же формат, что в trainings_auto_close.
    const filter =
      "date >= strftime('%Y-%m-%d %H:%M:%S.000Z', @now, '+3 hours', '+55 minutes')" +
      " && date <= strftime('%Y-%m-%d %H:%M:%S.000Z', @now, '+4 hours', '+5 minutes')" +
      ' && is_deleted = false && reminder_4h_sent = false';

    const trainings = $app.findRecordsByFilter('trainings', filter, 'date', 0, 0);
    console.log('[reminder-4h] matched ' + trainings.length + ' trainings');
    if (!trainings.length) return;

    const notificationsCollection = $app.findCollectionByNameOrId('notifications');

    for (let i = 0; i < trainings.length; i++) {
      const training = trainings[i];
      const trainingId = training.getId();
      const bookedUsers = training.get('booked_users') || [];

      for (let j = 0; j < bookedUsers.length; j++) {
        const userId = bookedUsers[j];
        if (!userId) continue;

        const notification = new Record(notificationsCollection);
        notification.set('recipient', userId);
        notification.set('title', TITLE);
        notification.set('body', BODY);
        notification.set('badge_dynamic_type', 'training_countdown');
        notification.set('click_action', 'open_training');
        notification.set('meta', { trainingId: trainingId });
        notification.set('is_read', false);
        $app.save(notification);
      }

      training.set('reminder_4h_sent', true);
      $app.save(training);
      console.log(
        '[reminder-4h] training ' + trainingId + ' → ' + bookedUsers.length + ' notifications'
      );
    }
  } catch (err) {
    console.log('[reminder-4h] cron: ' + err);
  }
});
