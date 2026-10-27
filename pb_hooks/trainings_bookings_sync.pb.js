// Heal denormalized booked_users после гонки last-write-wins на relation-массиве.
// Источник правды — trainings_bookings; массив на trainings — кэш для клиента/фильтров.

onRecordAfterUpdateSuccess((e) => {
  try {
    var lib = require(__hooks + '/trainingslib.js');
    var record = e.record;
    if (!record) {
      e.next();
      return;
    }
    if (!lib.syncBookedUsersFromBookingsTable($app, record)) {
      e.next();
      return;
    }
    lib.withSkipBookingSideEffects(function () {
      $app.save(record);
    });
  } catch (err) {
    console.log('[trainings-bookings-sync] ' + err);
  }
  e.next();
}, 'trainings');
