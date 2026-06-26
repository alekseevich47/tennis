const TRAININGS_COLLECTION = 'trainings';

// В PB-хуках helper-функции вне callback недоступны внутри onRecord* — логику дублируем inline.
onRecordUpdateRequest((e) => {
  const date = e.record.getString('date');
  const started = date ? new Date(date) <= new Date() : false;
  if (!e.record.getBool('is_closed') && started) {
    e.record.set('is_closed', true);
  }
  e.next();
}, TRAININGS_COLLECTION);

onRecordViewRequest((e) => {
  const record = e.record;
  if (!record.getBool('is_closed')) {
    const date = record.getString('date');
    const started = date ? new Date(date) <= new Date() : false;
    if (started) {
      record.set('is_closed', true);
      $app.save(record);
    }
  }
  e.next();
}, TRAININGS_COLLECTION);
