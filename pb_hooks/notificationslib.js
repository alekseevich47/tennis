// In-app уведомления (колокольчик). Файл без .pb.js — require() внутри хендлеров/cron.

var TRAINING_COUNTDOWN_TITLE = 'Не забыли? 😜';
var TRAINING_COUNTDOWN_BODY =
  'А мы напоминаем, совсем скоро у Вас запланирована тренировка! Мы Вас будем ждать! Но если что-то пошло не по плану, обязательно сообщите нам.';
var TRAINING_FAREWELL_TITLE = 'Будем скучать! 💔';
var TRAINING_FAREWELL_BODY =
  'Ваша запись на тренировку отменена. Не переживайте, главное — не терять настрой! Надеемся на скорую встречу. Выберите удобное время для следующего занятия, как только будете готовы.';
var TRAINING_FAREWELL_BADGE = 'Очень жаль, что не увиделись 😢';
var TRAINING_COMPLETED_TITLE = 'Тренировка завершена! 🎉';
var TRAINING_COMPLETED_BODY =
  'Поздравляем с мощной тренировкой! Вы отлично потрудились и сделали еще один важный шаг к своей цели. Отдыхайте, восстанавливайте силы и гордитесь собой!';
var TRAINING_COMPLETED_BADGE = 'Отличная работа! 💪';
var FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function relationId(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry.getId === 'function') return entry.getId();
  if (entry.id) return String(entry.id);
  return String(entry);
}

function normalizeRelationIds(entries) {
  var ids = [];
  var i;
  for (i = 0; i < entries.length; i++) {
    var id = relationId(entries[i]);
    if (id) ids.push(id);
  }
  return ids;
}

function parsePbDate(str) {
  if (!str) return null;
  return new Date(String(str).replace(' ', 'T'));
}

function pbDateFilterStr(offsetMs) {
  var iso = new Date(Date.now() + offsetMs).toISOString();
  return iso.replace('T', ' ').replace(/\.\d{3}Z$/, '.000Z');
}

function getMetaTrainingId(notification) {
  var meta = notification.get('meta');
  if (!meta) return '';
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch (_) {
      return '';
    }
  }
  return meta && meta.trainingId ? String(meta.trainingId) : '';
}

function findTrainingNotification(userId, trainingId) {
  var list = $app.findRecordsByFilter(
    'notifications',
    'recipient = "' + userId + '" && training_id = "' + trainingId + '"',
    '',
    0,
    0
  );
  if (list.length > 0) return list[0];

  // Fallback для записей до миграции на training_id
  list = $app.findRecordsByFilter(
    'notifications',
    'recipient = "' + userId + '" && badge_dynamic_type = "training_countdown"',
    '',
    0,
    0
  );
  for (var i = 0; i < list.length; i++) {
    if (getMetaTrainingId(list[i]) === trainingId) return list[i];
  }
  return null;
}

function getStateFields(targetState) {
  if (targetState === 'countdown') {
    return {
      title: TRAINING_COUNTDOWN_TITLE,
      body: TRAINING_COUNTDOWN_BODY,
      badge_dynamic_type: 'training_countdown',
      badge_text: '',
      click_action: 'open_training',
      training_state: 'countdown'
    };
  }
  if (targetState === 'farewell') {
    return {
      title: TRAINING_FAREWELL_TITLE,
      body: TRAINING_FAREWELL_BODY,
      badge_dynamic_type: '',
      badge_text: TRAINING_FAREWELL_BADGE,
      click_action: 'open_booking',
      training_state: 'farewell'
    };
  }
  return {
    title: TRAINING_COMPLETED_TITLE,
    body: TRAINING_COMPLETED_BODY,
    badge_dynamic_type: '',
    badge_text: TRAINING_COMPLETED_BADGE,
    click_action: 'open_booking',
    training_state: 'completed'
  };
}

function applyStateFields(notification, fields, trainingId) {
  notification.set('title', fields.title);
  notification.set('body', fields.body);
  notification.set('badge_dynamic_type', fields.badge_dynamic_type);
  notification.set('badge_text', fields.badge_text);
  notification.set('click_action', fields.click_action);
  notification.set('training_state', fields.training_state);
  notification.set('training_id', trainingId);
  notification.set('is_read', false);
}

/**
 * Find-or-transition-else-create уведомление «Не забыли?» на пару (user, training).
 * @param {'countdown'|'farewell'|'completed'} targetState
 * @returns {boolean} true если запись создана или обновлена
 */
function upsertTrainingNotification(userId, trainingId, targetState) {
  userId = relationId(userId);
  trainingId = relationId(trainingId);
  if (!userId || !trainingId || !targetState) return false;

  var existing = findTrainingNotification(userId, trainingId);
  var fields = getStateFields(targetState);

  if (existing) {
    if (targetState === 'completed' && existing.getString('training_state') === 'farewell') {
      return false;
    }
    if (existing.getString('training_state') === targetState) {
      return false;
    }
    applyStateFields(existing, fields, trainingId);
    $app.save(existing);
    return true;
  }

  if (targetState === 'farewell') return false;

  if (targetState === 'countdown') {
    var training;
    try {
      training = $app.findRecordById('trainings', trainingId);
    } catch (_) {
      return false;
    }
    if (!isWithinCountdownWindow(training.getString('date'))) return false;
  }

  var notificationsCollection = $app.findCollectionByNameOrId('notifications');
  var notification = new Record(notificationsCollection);
  notification.set('recipient', userId);
  applyStateFields(notification, fields, trainingId);
  notification.set('meta', { trainingId: trainingId });
  $app.save(notification);
  return true;
}

function isWithinCountdownWindow(dateStr, now) {
  var start = parsePbDate(dateStr);
  if (!start || isNaN(start.getTime())) return false;
  var ref = now || new Date();
  if (start <= ref) return false;
  return start.getTime() - ref.getTime() <= FOUR_HOURS_MS;
}

function newlyAddedUserIds(oldBooked, newBooked) {
  var oldIds = normalizeRelationIds(oldBooked);
  var newIds = normalizeRelationIds(newBooked);
  var added = [];
  var i;
  for (i = 0; i < newIds.length; i++) {
    if (oldIds.indexOf(newIds[i]) === -1) added.push(newIds[i]);
  }
  return added;
}

var SESSIONS_LEFT_COPY = {
  3: {
    title: 'Движение — это жизнь 🏃‍♂️',
    body: 'У вас осталось всего 3 визита. Самое время закрепить результат и спланировать следующие тренировки, чтобы не терять форму!',
    badge_text: 'Осталось 3 посещения!'
  },
  2: {
    title: 'Мы ценим Ваше время 🙏🏼',
    body: 'В вашем распоряжении остается совсем немного. Продлите абонемент сейчас, чтобы не прерывать прогресс в последний момент.',
    badge_text: 'Осталось 2 посещения!'
  },
  1: {
    title: 'Скоро понадобится добавка! 🤏🏼',
    body: 'Осталось всего ничего... Продлите абонемент заранее, чтобы не тратить время на формальности при следующем входе.',
    badge_text: 'Осталось 1 посещение!'
  },
  0: {
    title: 'Я сейчас заплачу 😭',
    body: 'Они закончились! Но мы верим, что увидим Вас снова!',
    badge_text: 'Осталось 0 посещений!'
  }
};

/**
 * In-app уведомление «осталось N посещений» при списании/возврате с сервера.
 * @param {core.App} app
 * @param {string} userId
 * @param {number} previousAvailable
 * @param {number} newAvailable
 * @param {string} [membershipType]
 */
function maybeNotifySessionsLeft(app, userId, previousAvailable, newAvailable, membershipType) {
  if (membershipType !== 'regular') return;
  if (previousAvailable === newAvailable) return;
  if ([0, 1, 2, 3].indexOf(newAvailable) === -1) return;

  var copy = SESSIONS_LEFT_COPY[newAvailable];
  if (!copy) return;

  try {
    var notificationsCollection = app.findCollectionByNameOrId('notifications');
    var notification = new Record(notificationsCollection);
    notification.set('recipient', userId);
    notification.set('title', copy.title);
    notification.set('body', copy.body);
    notification.set('badge_text', copy.badge_text);
    notification.set('click_action', 'open_membership');
    notification.set('is_read', false);
    app.save(notification);
  } catch (err) {
    console.log('[notificationslib] maybeNotifySessionsLeft: ' + err);
  }
}

module.exports = {
  FOUR_HOURS_MS: FOUR_HOURS_MS,
  relationId: relationId,
  pbDateFilterStr: pbDateFilterStr,
  upsertTrainingNotification: upsertTrainingNotification,
  newlyAddedUserIds: newlyAddedUserIds,
  isWithinCountdownWindow: isWithinCountdownWindow,
  maybeNotifySessionsLeft: maybeNotifySessionsLeft
};
