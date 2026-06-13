const TRAININGS_COLLECTION = 'trainings';

function hasTrainingStarted(record) {
  const date = record.getString('date');
  return date ? new Date(date) <= new Date() : false;
}

function closeStartedTraining(record) {
  if (record.getBool('is_closed') || !hasTrainingStarted(record)) return;

  record.set('is_closed', true);
  $app.save(record);
}

onRecordUpdateRequest((e) => {
  if (!e.record.getBool('is_closed') && hasTrainingStarted(e.record)) {
    e.record.set('is_closed', true);
  }
  e.next();
}, TRAININGS_COLLECTION);

onRecordViewRequest((e) => {
  closeStartedTraining(e.record);
  e.next();
}, TRAININGS_COLLECTION);
