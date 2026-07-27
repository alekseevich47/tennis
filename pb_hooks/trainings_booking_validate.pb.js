// Серверная валидация записи на тренировку (bot_blocked, заморозка, посещения, лимит мест).

onRecordUpdateRequest((e) => {
  var original = e.record.original();
  if (!original) {
    e.next();
    return;
  }
  try {
    var lib = require(__hooks + '/trainingslib.js');
    lib.validateBookingAdditions(original, e.record);
  } catch (err) {
    throw err;
  }
  e.next();
}, 'trainings');
