onBootstrap((e) => {
  e.next();
  try {
    $app.findFirstRecordByFilter('notification_settings', '');
    console.log('[admin] notification_settings: запись уже существует, пропуск');
  } catch (err) {
    const collection = $app.findCollectionByNameOrId('notification_settings');
    const record = new Record(collection);
    record.set('training_reminder_enabled', true);
    record.set('training_created_enabled', true);
    record.set('training_edited_enabled', true);
    record.set('training_deleted_enabled', true);
    record.set('posts_created_enabled', true);
    record.set('tournament_posts_created_enabled', true);
    record.set('training_booking_enabled', true);
    record.set('comments_notification_enabled', true);
    $app.save(record);
    console.log('[admin] notification_settings: создан singleton (все 8 полей = true)');
  }
});
