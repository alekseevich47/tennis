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

// Основной механизм: каждую минуту закрываем запись на начавшиеся тренировки.
// onRecordUpdateRequest / onRecordViewRequest выше — доп. подстраховка.
cronAdd('auto_close_started_trainings', '* * * * *', () => {
  try {
    const now = new Date().toISOString();
    const filter = 'date <= "' + now + '" && is_closed = false && is_deleted = false';
    const trainings = $app.findRecordsByFilter('trainings', filter, '', 0, 0);
    for (let i = 0; i < trainings.length; i++) {
      trainings[i].set('is_closed', true);
      $app.save(trainings[i]);
    }
  } catch (err) {
    console.log('[auto-close] ' + err);
  }
});
