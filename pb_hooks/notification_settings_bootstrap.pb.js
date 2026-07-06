onBootstrap((e) => {
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
    $app.save(record);
    console.log('[admin] notification_settings: создан singleton (все 4 поля = true)');
  }
  e.next();
});
