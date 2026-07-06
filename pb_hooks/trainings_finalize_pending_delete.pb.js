const TRAININGS_COLLECTION = 'trainings';

// При soft-delete ставим delete_pending_at; при restore / финализации — сбрасываем.
onRecordUpdateRequest((e) => {
  const isDeleted = e.record.getBool('is_deleted');
  const isCancelled = e.record.getBool('is_cancelled');

  if (isDeleted && !isCancelled) {
    const pendingAt = e.record.getString('delete_pending_at');
    if (!pendingAt) {
      e.record.set('delete_pending_at', new Date().toISOString());
    }
  } else {
    e.record.set('delete_pending_at', '');
  }

  e.next();
}, TRAININGS_COLLECTION);

// Каждую минуту финализируем soft-delete старше 2 минут (независимо от клиента / закрытия MAX).
cronAdd('finalize_pending_deleted_trainings', '* * * * *', () => {
  const trainingslib = require(__hooks + '/trainingslib.js');
  try {
    const filter = 'is_deleted = true && is_cancelled = false';
    const trainings = $app.findRecordsByFilter(TRAININGS_COLLECTION, filter, '', 0, 0);
    for (let i = 0; i < trainings.length; i++) {
      if (trainingslib.isReadyToFinalizePendingDelete(trainings[i])) {
        try {
          trainingslib.finalizeCancelledTrainingRecord(trainings[i]);
        } catch (err) {
          console.log('[finalize-pending-delete] training ' + trainings[i].getId() + ': ' + err);
        }
      }
    }
  } catch (err) {
    console.log('[finalize-pending-delete] cron: ' + err);
  }
});
