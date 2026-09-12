// Серверная валидация + атомарное списание/возврат сессий и attendance_count
// при изменении booked_users / attended_users / is_cancelled (см. TASKS_SECURITY блок D).
// Field ACL: non-moderator может менять только booking-поля (см. assertTrainingUpdateAllowed).

onRecordUpdateRequest((e) => {
  try {
    var original = e.record.original();
    if (!original) {
      e.next();
      return;
    }
    var lib = require(__hooks + '/trainingslib.js');
    lib.assertTrainingUpdateAllowed(original, e.record, e.auth);
    lib.applyBookingSideEffects(original, e.record, e.auth);
    e.next();
  } catch (err) {
    var status = err && err.status;
    if (status >= 400 && status < 600) throw err;
    console.log('[trainings-booking-validate] ' + err);
    throw new BadRequestError('trainings update: ' + (err.message || String(err)));
  }
}, 'trainings');
