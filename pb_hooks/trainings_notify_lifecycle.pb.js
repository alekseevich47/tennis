// Жизненный цикл in-app уведомления «Не забыли?»: запись/снятие/отмена/восстановление тренировки.
onRecordAfterUpdateSuccess((e) => {
  try {
    var lib = require(__hooks + '/notificationslib.js');
    var record = e.record;
    var original = record.original();
    if (!original) {
      e.next();
      return;
    }

    var trainingId = lib.relationId(record);
    var i;

    var oldBooked = original.get('booked_users') || [];
    var newBooked = record.get('booked_users') || [];
    var addedBooked = lib.newlyAddedUserIds(oldBooked, newBooked);
    if (addedBooked.length && !record.getBool('is_deleted') && !record.getBool('is_cancelled')) {
      for (i = 0; i < addedBooked.length; i++) {
        lib.upsertTrainingNotification(addedBooked[i], trainingId, 'countdown');
      }
    }

    var oldUnbooked = original.get('unbooked_users') || [];
    var newUnbooked = record.get('unbooked_users') || [];
    var addedUnbooked = lib.newlyAddedUserIds(oldUnbooked, newUnbooked);
    for (i = 0; i < addedUnbooked.length; i++) {
      lib.upsertTrainingNotification(addedUnbooked[i], trainingId, 'farewell');
    }

    var wasCancelled = original.getBool('is_cancelled');
    var isCancelled = record.getBool('is_cancelled');
    if (!wasCancelled && isCancelled) {
      var bookedOnCancel = record.get('booked_users') || [];
      for (i = 0; i < bookedOnCancel.length; i++) {
        lib.upsertTrainingNotification(bookedOnCancel[i], trainingId, 'farewell');
      }
    }

    if (wasCancelled && !isCancelled) {
      var bookedOnRestore = record.get('booked_users') || [];
      for (i = 0; i < bookedOnRestore.length; i++) {
        lib.upsertTrainingNotification(bookedOnRestore[i], trainingId, 'countdown');
      }
    }
  } catch (err) {
    console.log('[notify-lifecycle] ' + err);
  }
  e.next();
}, 'trainings');
