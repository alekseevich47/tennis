// В PB-хуках helper-функции вне callback недоступны внутри onRecord* — логику дублируем inline.
// PB хранит date с пробелом ("2026-07-06 11:00:00.000Z"); goja требует T — нормализуем перед парсингом.
onRecordUpdateRequest((e) => {
  const date = e.record.getString('date');
  // console.log('[auto-close] onRecordUpdateRequest date raw:', date);
  const started = date ? new Date(date.replace(' ', 'T')) <= new Date() : false;
  if (!e.record.getBool('is_closed') && started) {
    e.record.set('is_closed', true);
  }
  e.next();
}, 'trainings');

onRecordViewRequest((e) => {
  const record = e.record;
  if (!record.getBool('is_closed')) {
    const date = record.getString('date');
    // console.log('[auto-close] onRecordViewRequest date raw:', date);
    const started = date ? new Date(date.replace(' ', 'T')) <= new Date() : false;
    if (started) {
      record.set('is_closed', true);
      $app.save(record);
    }
  }
  e.next();
}, 'trainings');

// Основной механизм: каждую минуту закрываем запись на начавшиеся тренировки.
// onRecordUpdateRequest / onRecordViewRequest выше — доп. подстраховка.
cronAdd('auto_close_started_trainings', '* * * * *', () => {
  try {
    const audit = require(__hooks + '/auditlib.js');
    const bot = require(__hooks + '/botlib.js');
    const filter = 'date <= @now && is_closed = false && is_deleted = false';
    const trainings = $app.findRecordsByFilter('trainings', filter, '', 0, 0);
    for (let i = 0; i < trainings.length; i++) {
      trainings[i].set('is_closed', true);
      $app.save(trainings[i]);
      const dateStr = trainings[i].getString('date');
      const location = trainings[i].getString('location') || '';
      const dateFormatted = dateStr ? bot.formatDateTimeGmt7(String(dateStr).replace(' ', 'T')) : '';
      const objectLabel = (dateFormatted && location)
        ? (dateFormatted + ', ' + location)
        : (dateFormatted || location || trainings[i].id);
      audit.logEvent($app, {
        category: 'booking',
        action: 'booking.enrollment.close',
        actionKind: 'update',
        subject: null,
        subjectSource: 'system',
        objectType: 'training',
        objectId: trainings[i].id,
        objectLabel: objectLabel,
        effectiveAt: dateStr || undefined,
        details: { trainingId: trainings[i].id },
        summaryRu: 'Система автоматически закрыла запись на тренировку ' + objectLabel,
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[auto-close] ' + err);
  }
});
