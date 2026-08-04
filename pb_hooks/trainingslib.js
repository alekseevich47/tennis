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

function restoreMembershipSession(app, userId, options) {
  var skipNotify = options && options.skipNotify;
  var user;
  try {
    user = app.findRecordById('users', userId);
  } catch (_) {
    return;
  }
  var membershipType = user.getString('membership_type');
  var usedSessions = user.getFloat('used_sessions') || 0;
  var previousAvailable = user.getFloat('available_sessions') || 0;
  user.set('used_sessions', Math.max(0, usedSessions - 1));
  var newAvailable = previousAvailable;
  if (!isUnlimitedMembership(membershipType)) {
    newAvailable = previousAvailable + 1;
    user.set('available_sessions', newAvailable);
  }
  app.save(user);
  if (!skipNotify) {
    try {
      var nlib = require(__hooks + '/notificationslib.js');
      nlib.maybeNotifySessionsLeft(app, userId, previousAvailable, newAvailable, membershipType);
    } catch (_) {}
  }
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
 * Работает через $app.save — onRecordUpdateRequest не вызывается (нет двойного возврата).
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
      restoreMembershipSession($app, bookedUsers[i], { skipNotify: true });
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

  try {
    var audit = require(__hooks + '/auditlib.js');
    var bot = require(__hooks + '/botlib.js');
    var dateStr = training.getString('date');
    var location = training.getString('location') || '';
    var dateFormatted = dateStr ? bot.formatDateTimeGmt7(String(dateStr).replace(' ', 'T')) : '';
    var objectLabel = (dateFormatted && location)
      ? (dateFormatted + ', ' + location)
      : (dateFormatted || location || training.id);
    audit.logEvent($app, {
      category: 'booking',
      action: 'booking.training.delete',
      actionKind: 'delete',
      subject: null,
      subjectSource: 'system',
      objectType: 'training',
      objectId: training.id,
      objectLabel: objectLabel,
      effectiveAt: dateStr || undefined,
      details: { trainingId: training.id },
      summaryRu: 'Система окончательно отменила тренировку ' + objectLabel,
      severity: 'warning'
    });
  } catch (auditErr) {
    console.log('[trainingslib] audit finalize: ' + auditErr);
  }

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

var BOT_BLOCKED_BOOKING_MESSAGE =
  'Невозможно записать: пользователь заблокировал бота в MAX, уведомления о тренировках недоступны.';

function dayBoundsIso(dateStr) {
  var day = parsePbDate(dateStr);
  if (!day || isNaN(day.getTime())) return null;
  var dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  var dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return { from: dayStart.toISOString(), to: dayEnd.toISOString() };
}

/**
 * @param {core.App} app
 * @param {string} userId
 * @param {string} trainingDate
 * @param {string} trainingId
 */
function hasAnnualBookingSameDay(app, userId, trainingDate, trainingId) {
  var bounds = dayBoundsIso(trainingDate);
  if (!bounds) return false;
  var filter =
    'date >= "' +
    bounds.from +
    '" && date <= "' +
    bounds.to +
    '" && booked_users ?~ "' +
    userId +
    '" && id != "' +
    trainingId +
    '" && is_deleted != true';
  var existing = app.findRecordsByFilter('trainings', filter, '', 1, 0);
  return existing.length > 0;
}

/**
 * @param {core.App} app
 * @param {string} userId
 * @param {boolean} isModerator
 * @param {string} trainingDate
 * @param {string} trainingId
 * @param {{ skipEligibilityChecks?: boolean }} [options] — restore: только баланс сессий
 */
function consumeMembershipSessionTx(app, userId, isModerator, trainingDate, trainingId, options) {
  var skipEligibility = options && options.skipEligibilityChecks;
  var user;
  try {
    user = app.findRecordById('users', userId);
  } catch (_) {
    throw new BadRequestError('Пользователь не найден');
  }

  if (!skipEligibility) {
    if (user.getBool('bot_blocked')) {
      throw new BadRequestError(BOT_BLOCKED_BOOKING_MESSAGE);
    }
    if (user.getBool('membership_frozen')) {
      throw new BadRequestError('Абонемент пользователя заморожен. Запись невозможна.');
    }
  }

  var membershipType = user.getString('membership_type') || 'regular';
  var unlimited = isUnlimitedMembership(membershipType);
  var previousAvailable = user.getFloat('available_sessions') || 0;

  if (!unlimited) {
    if (previousAvailable <= 0) {
      throw new BadRequestError('Нет доступных посещений');
    }
  }

  if (!skipEligibility && membershipType === 'annual' && !isModerator) {
    if (hasAnnualBookingSameDay(app, userId, trainingDate, trainingId)) {
      throw new BadRequestError('ANNUAL_DAILY_LIMIT');
    }
  }

  var usedSessions = user.getFloat('used_sessions') || 0;
  user.set('used_sessions', usedSessions + 1);
  var newAvailable = previousAvailable;
  if (!unlimited) {
    newAvailable = previousAvailable - 1;
    user.set('available_sessions', newAvailable);
  }
  app.save(user);

  try {
    var nlib = require(__hooks + '/notificationslib.js');
    nlib.maybeNotifySessionsLeft(app, userId, previousAvailable, newAvailable, membershipType);
  } catch (_) {}
}

/**
 * @param {core.App} app
 * @param {string} userId
 * @param {number} delta
 */
function adjustAttendanceCountTx(app, userId, delta) {
  var user;
  try {
    user = app.findRecordById('users', userId);
  } catch (_) {
    throw new BadRequestError('Пользователь не найден');
  }
  var cnt = user.getFloat('attendance_count') || 0;
  user.set('attendance_count', Math.max(0, cnt + delta));
  app.save(user);
}

/**
 * Атомарные побочные эффекты записи/отмены/посещения при API-update trainings.
 * Cancel/restore (is_cancelled) — отдельная ветка: booked_users часто не меняется,
 * а сессии уже возвращены при финализации через $app.save.
 *
 * @param {core.Record} original
 * @param {core.Record} record
 * @param {{ id?: string, getString?: Function } | null} auth
 */
function applyBookingSideEffects(original, record, auth) {
  var audit = require(__hooks + '/auditlib.js');

  var added = audit.newlyAdded(original.get('booked_users'), record.get('booked_users'));
  var removed = audit.newlyRemoved(original.get('booked_users'), record.get('booked_users'));
  var attendedAdded = audit.newlyAdded(original.get('attended_users'), record.get('attended_users'));
  var attendedRemoved = audit.newlyRemoved(original.get('attended_users'), record.get('attended_users'));

  var isModerator = !!(auth && auth.getString && auth.getString('role') === 'moderator');
  var authId = auth && auth.id ? String(auth.id) : '';

  var isCancelTransition = !original.getBool('is_cancelled') && record.getBool('is_cancelled');
  var isRestoreTransition = original.getBool('is_cancelled') && !record.getBool('is_cancelled');
  var ended = hasTimeRangeEnded(record.getString('date'), record.getFloat('duration') || 0);
  var trainingDate = record.getString('date');
  var trainingId = record.id;
  var i;

  // --- IDOR (C-6): обычный пользователь — только себя; посещаемость — только модератор ---
  if (!isCancelTransition && !isRestoreTransition) {
    if (added.length && !isModerator) {
      for (i = 0; i < added.length; i++) {
        if (String(added[i]) !== authId) {
          throw new ForbiddenError('Можно записать только себя');
        }
      }
    }
    if (removed.length && !isModerator) {
      for (i = 0; i < removed.length; i++) {
        if (String(removed[i]) !== authId) {
          throw new ForbiddenError('Можно снять с записи только себя');
        }
      }
    }
    if ((attendedAdded.length || attendedRemoved.length) && !isModerator) {
      throw new ForbiddenError('Отметка посещения — только модератор');
    }
  }

  // Лимит мест (как раньше в validateBookingAdditions)
  var maxSlots = record.getFloat('max_slots') || 0;
  var bookedCount = audit.newlyAdded([], record.get('booked_users')).length;
  if (maxSlots > 0 && bookedCount > maxSlots) {
    throw new BadRequestError('Нет свободных мест');
  }

  var hasWork =
    isCancelTransition ||
    isRestoreTransition ||
    added.length ||
    removed.length ||
    attendedAdded.length ||
    attendedRemoved.length;
  if (!hasWork) return;

  $app.runInTransaction(function (txApp) {
    if (isCancelTransition) {
      // Симметрия finalizeCancelledTrainingRecord, но для API-пути (клиентский flush).
      if (!ended) {
        var cancelBooked = audit.newlyAdded([], original.get('booked_users'));
        var cancelAttended = audit.newlyAdded([], original.get('attended_users'));
        var cancelAttendedSet = {};
        for (i = 0; i < cancelAttended.length; i++) {
          cancelAttendedSet[cancelAttended[i]] = true;
        }
        for (i = 0; i < cancelBooked.length; i++) {
          restoreMembershipSession(txApp, cancelBooked[i], { skipNotify: true });
          if (cancelAttendedSet[cancelBooked[i]]) {
            adjustAttendanceCountTx(txApp, cancelBooked[i], -1);
          }
        }
      }
      return;
    }

    if (isRestoreTransition) {
      // Сессии уже возвращены при cancel; повторно списываем только оставшихся в booked_users.
      // Diff booked/attended НЕ применяем — снятые «insufficient» уже с восстановленными сессиями.
      if (!ended) {
        var restoreBooked = audit.newlyAdded([], record.get('booked_users'));
        var restoreAttended = audit.newlyAdded([], record.get('attended_users'));
        for (i = 0; i < restoreBooked.length; i++) {
          consumeMembershipSessionTx(txApp, restoreBooked[i], true, trainingDate, trainingId, {
            skipEligibilityChecks: true
          });
        }
        for (i = 0; i < restoreAttended.length; i++) {
          adjustAttendanceCountTx(txApp, restoreAttended[i], 1);
        }
      }
      return;
    }

    for (i = 0; i < added.length; i++) {
      consumeMembershipSessionTx(txApp, added[i], isModerator, trainingDate, trainingId);
    }
    for (i = 0; i < removed.length; i++) {
      restoreMembershipSession(txApp, removed[i]);
    }
    for (i = 0; i < attendedAdded.length; i++) {
      adjustAttendanceCountTx(txApp, attendedAdded[i], 1);
    }
    for (i = 0; i < attendedRemoved.length; i++) {
      adjustAttendanceCountTx(txApp, attendedRemoved[i], -1);
    }
  });
}

module.exports = {
  FINALIZE_GRACE_MS: FINALIZE_GRACE_MS,
  finalizeCancelledTrainingRecord: finalizeCancelledTrainingRecord,
  isReadyToFinalizePendingDelete: isReadyToFinalizePendingDelete,
  hasTimeRangeEnded: hasTimeRangeEnded,
  applyBookingSideEffects: applyBookingSideEffects,
  // backward-compat alias (если кто-то ещё require'ит старое имя)
  validateBookingAdditions: function (original, record) {
    applyBookingSideEffects(original, record, null);
  }
};
