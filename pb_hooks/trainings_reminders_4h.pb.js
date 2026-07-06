// In-app напоминание за ~4 часа до тренировки (колокольчик, не MAX-бот).
// Окно 3h55m..4h05m от @now — крон каждые 5 минут перекрывает ±5 мин.
cronAdd('training_reminder_4h', '*/5 * * * *', () => {
  const TITLE = 'Не забыли? 😜';
  const BODY =
    'А мы напоминаем, совсем скоро у Вас запланирована тренировка! Мы Вас будем ждать! Но если что-то пошло не по плану, обязательно сообщите нам.';

  try {
    const now = Date.now();
    const minStr = new Date(now + (3 * 60 + 55) * 60 * 1000).toISOString().replace('T', ' ');
    const maxStr = new Date(now + (4 * 60 + 5) * 60 * 1000).toISOString().replace('T', ' ');
    const filter =
      'date >= "' +
      minStr +
      '" && date <= "' +
      maxStr +
      '" && is_deleted = false && reminder_4h_sent = false';

    const trainings = $app.findRecordsByFilter('trainings', filter, 'date', 0, 0);
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
