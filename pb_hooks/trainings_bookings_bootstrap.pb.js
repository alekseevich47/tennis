// Миграция denormalized trainings.booked_users → атомарная trainings_bookings.
// Источник правды для capacity/idempotency — таблица (Strix 3.3–3.5).
// API rules коллекции = null (только $app.save из хуков).

onBootstrap((e) => {
  e.next();
  try {
    var lib = require(__hooks + '/trainingslib.js');
    var stats = lib.syncAllTrainingsBookingsFromArrays($app);
    console.log(
      '[trainings-bookings] bootstrap: trainings=' +
        stats.trainings +
        ' newRows~=' +
        stats.insertedApprox
    );
  } catch (err) {
    console.log('[trainings-bookings] bootstrap skipped: ' + err);
  }
});
