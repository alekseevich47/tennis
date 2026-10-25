// Singleton notification_settings: все бот-тумблеры = true.
// settings_seed — одноразовая миграция новых полей на уже существующей записи
// (иначе bool-default false после import schema выключит рассылки до ручного включения).
onBootstrap((e) => {
  e.next();

  const SEED = 'bot_notify_v3';
  const ALL_FIELDS = [
    'training_reminder_enabled',
    'training_created_enabled',
    'training_edited_enabled',
    'training_deleted_enabled',
    'training_booking_enabled',
    'posts_created_enabled',
    'tournament_posts_created_enabled',
    'comments_notification_enabled',
    'user_registered_enabled',
    'welcome_enabled',
    'training_status_enabled',
    'training_restored_enabled',
    'membership_freeze_enabled',
    'membership_stop_enabled',
    'membership_expiry_enabled',
    'membership_topup_enabled'
  ];
  // Поля, добавленные в v3 — только их выставляем true при миграции (старые тумблеры не трогаем).
  const NEW_IN_V3 = [
    'user_registered_enabled',
    'welcome_enabled',
    'training_status_enabled',
    'training_restored_enabled',
    'membership_freeze_enabled',
    'membership_stop_enabled',
    'membership_expiry_enabled',
    'membership_topup_enabled'
  ];

  try {
    let record;
    try {
      record = $app.findFirstRecordByFilter('notification_settings', '');
    } catch (_) {
      const collection = $app.findCollectionByNameOrId('notification_settings');
      record = new Record(collection);
      for (let i = 0; i < ALL_FIELDS.length; i++) {
        record.set(ALL_FIELDS[i], true);
      }
      record.set('settings_seed', SEED);
      $app.save(record);
      console.log('[admin] notification_settings: создан singleton (все ' + ALL_FIELDS.length + ' полей = true)');
      return;
    }

    if (record.getString('settings_seed') === SEED) {
      console.log('[admin] notification_settings: запись уже существует, seed актуален');
      return;
    }

    for (let i = 0; i < NEW_IN_V3.length; i++) {
      record.set(NEW_IN_V3[i], true);
    }
    record.set('settings_seed', SEED);
    $app.save(record);
    console.log('[admin] notification_settings: миграция ' + SEED + ' — новые поля = true');
  } catch (err) {
    console.log('[admin] notification_settings bootstrap skipped: ' + err);
  }
});
