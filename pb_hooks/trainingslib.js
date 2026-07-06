// Общая серверная логика тренировок. Файл без .pb.js — require() внутри хендлеров/cron.
// Дублирует finalizeCancelledTraining из client/src/services/trainings.js (без клиентского аудита).

var FINALIZE_GRACE_MS = 2 * 60 * 1000;

function parsePbDate(str) {
  if (!str) return null;
  return new Date(String(str).replace(' ', 'T'));
}

function hasTimeRangeEnded(dateStr, durationMin) {
  var start = parsePbDate(dateStr);
  if (!start || isNaN(start.getTime())) return false;
  var end = new Date(start.getTime() + (durationMin || 0) * 60 * 1000);
  return end < new Date();
}

function isUnlimitedMembership(membershipType) {
  return membershipType === 'annual' || membershipType === 'corporate';
}

function restoreMembershipSession(userId) {
  var user;
  try {
    user = $app.findRecordById('users', userId);
  } catch (_) {
    return;
  }
  var membershipType = user.getString('membership_type');
  var usedSessions = user.getFloat('used_sessions') || 0;
  user.set('used_sessions', Math.max(0, usedSessions - 1));
  if (!isUnlimitedMembership(membershipType)) {
    var available = user.getFloat('available_sessions') || 0;
    user.set('available_sessions', available + 1);
  }
  $app.save(user);
}

function notifyTrainingCancelled(training) {
  var bot = require(__hooks + '/botlib.js');
  var typeWord = training.getString('type') === 'tournament' ? 'турнир' : 'тренировка';
  var dateFormatted = bot.formatDateTimeGmt7(training.getString('date'));
  var text =
    'Уважаемые участники, ' +
    typeWord +
    ' *' +
    dateFormatted +
    '* по техническим причинам не состоится. Количество доступных посещений будет восстановлено.';
  bot.broadcastToAllUsers(text);
}

/**
 * Финализация отмены (idempotent): is_cancelled = true, возврат сессий, уведомление.
 * @param {core.Record} training
 */
function finalizeCancelledTrainingRecord(training) {
  if (!training || training.getBool('is_cancelled')) return;

  var duration = training.getFloat('duration') || 0;
  var ended = hasTimeRangeEnded(training.getString('date'), duration);

  if (!ended) {
    var bookedUsers = training.get('booked_users') || [];
    var attendedUsers = training.get('attended_users') || [];
    var attendedSet = {};
    var i;
    for (i = 0; i < attendedUsers.length; i++) {
      attendedSet[attendedUsers[i]] = true;
    }
    for (i = 0; i < bookedUsers.length; i++) {
      restoreMembershipSession(bookedUsers[i]);
      if (attendedSet[bookedUsers[i]]) {
        try {
          var u = $app.findRecordById('users', bookedUsers[i]);
          var cnt = u.getFloat('attendance_count') || 0;
          u.set('attendance_count', Math.max(0, cnt - 1));
          $app.save(u);
        } catch (_) {}
      }
    }
  }

  training.set('is_cancelled', true);
  training.set('delete_pending_at', '');
  $app.save(training);

  if (!ended) {
    notifyTrainingCancelled(training);
  }
}

/**
 * @param {core.Record} training
 * @param {number} [graceMs]
 */
function isReadyToFinalizePendingDelete(training, graceMs) {
  if (!training.getBool('is_deleted') || training.getBool('is_cancelled')) return false;

  var ms = graceMs || FINALIZE_GRACE_MS;
  var cutoff = new Date(Date.now() - ms);
  var pendingAt = training.getString('delete_pending_at');
  var refDate = pendingAt ? parsePbDate(pendingAt) : parsePbDate(training.getString('updated'));
  if (!refDate || isNaN(refDate.getTime())) return false;
  return refDate <= cutoff;
}

module.exports = {
  FINALIZE_GRACE_MS: FINALIZE_GRACE_MS,
  finalizeCancelledTrainingRecord: finalizeCancelledTrainingRecord,
  isReadyToFinalizePendingDelete: isReadyToFinalizePendingDelete,
  hasTimeRangeEnded: hasTimeRangeEnded
};
