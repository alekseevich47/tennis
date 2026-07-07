// In-app уведомления (колокольчик). Файл без .pb.js — require() внутри хендлеров/cron.

var TRAINING_COUNTDOWN_TITLE = 'Не забыли? 😜';
var TRAINING_COUNTDOWN_BODY =
  'А мы напоминаем, совсем скоро у Вас запланирована тренировка! Мы Вас будем ждать! Но если что-то пошло не по плану, обязательно сообщите нам.';
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

function findTrainingCountdownNotification(userId, trainingId) {
  var list = $app.findRecordsByFilter(
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

/**
 * Создаёт одно in-app уведомление с обратным отсчётом (idempotent).
 * @returns {boolean} true если создано новое
 */
function ensureTrainingCountdownNotification(userId, trainingId) {
  userId = relationId(userId);
  trainingId = relationId(trainingId);
  if (!userId || !trainingId) return false;
  if (findTrainingCountdownNotification(userId, trainingId)) return false;

  var notificationsCollection = $app.findCollectionByNameOrId('notifications');
  var notification = new Record(notificationsCollection);
  notification.set('recipient', userId);
  notification.set('title', TRAINING_COUNTDOWN_TITLE);
  notification.set('body', TRAINING_COUNTDOWN_BODY);
  notification.set('badge_dynamic_type', 'training_countdown');
  notification.set('click_action', 'open_training');
  notification.set('meta', { trainingId: trainingId });
  notification.set('is_read', false);
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

function ensureCountdownForNewlyBookedUsers(record, userIds) {
  if (!userIds.length) return 0;
  if (record.getBool('is_deleted') || record.getBool('is_cancelled')) return 0;
  if (!isWithinCountdownWindow(record.getString('date'))) return 0;

  var trainingId = relationId(record);
  var created = 0;
  var j;
  for (j = 0; j < userIds.length; j++) {
    if (ensureTrainingCountdownNotification(userIds[j], trainingId)) created++;
  }
  return created;
}

module.exports = {
  FOUR_HOURS_MS: FOUR_HOURS_MS,
  relationId: relationId,
  pbDateFilterStr: pbDateFilterStr,
  ensureTrainingCountdownNotification: ensureTrainingCountdownNotification,
  ensureCountdownForNewlyBookedUsers: ensureCountdownForNewlyBookedUsers,
  newlyAddedUserIds: newlyAddedUserIds,
  isWithinCountdownWindow: isWithinCountdownWindow
};
