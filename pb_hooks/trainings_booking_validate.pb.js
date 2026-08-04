// Серверная валидация + атомарное списание/возврат сессий и attendance_count
// при изменении booked_users / attended_users / is_cancelled (см. TASKS_SECURITY блок D).

onRecordUpdateRequest((e) => {
  var original = e.record.original();
  if (!original) {
    e.next();
    return;
  }
  var lib = require(__hooks + '/trainingslib.js');
  lib.applyBookingSideEffects(original, e.record, e.auth);
  e.next();
}, 'trainings');
