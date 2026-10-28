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

function isDailyLimitedMembership(membershipType) {
  return membershipType === 'annual' || membershipType === 'corporate';
}

/**
 * @param {core.App} app
 * @param {string} userId
 * @param {number} delta
 * @param {boolean} unpaid
 * @param {number} balanceAfter
 * @param {{ kind: string, trainingId?: string, trainingType?: string, trainingDate?: string, actor?: any, withinDailyLimit?: boolean } | undefined} ledger
 */
function logLedger(app, userId, delta, unpaid, balanceAfter, ledger) {
  if (!ledger || !ledger.kind) return;
  try {
    require(__hooks + '/membershipledgerlib.js').logMovement(app, {
      userId: userId,
      delta: delta,
      kind: ledger.kind,
      unpaid: unpaid,
      withinDailyLimit: !!ledger.withinDailyLimit,
      trainingId: ledger.trainingId,
      trainingType: ledger.trainingType,
      trainingDate: ledger.trainingDate,
      actor: ledger.actor,
      balanceAfter: balanceAfter
    });
  } catch (err) {
    console.log('[trainingslib] ledger: ' + err);
  }
}

/**
 * Возврат долговой записи (unbook/cancel/freeze/stop): исходная booking-строка с долгом
 * перестаёт быть «неоплаченной» (UI: зелёный кружок). Только SQL, id — безопасный скаляр.
 * @param {core.App} app
 * @param {string} userId
 * @param {string|undefined} trainingId
 */
function clearReturnedDebtBooking(app, userId, trainingId) {
  if (!userId || !trainingId) return;
  try {
    var row = new DynamicModel({ id: '' });
    app.db().newQuery(
      'SELECT id FROM membership_ledger WHERE "user" = {:uid} AND training_id = {:tid} ' +
        'AND kind IN (\'booking\', \'training_restored\') AND unpaid = true ' +
        'ORDER BY created DESC, id DESC LIMIT 1'
    ).bind({ uid: String(userId), tid: String(trainingId) }).one(row);
    if (!row.id) return;
    app.db().newQuery('UPDATE membership_ledger SET unpaid = false WHERE id = {:id}')
      .bind({ id: String(row.id) }).execute();
  } catch (_) {
    // нет строки или иная ошибка — не ломаем возврат сессии
  }
}

/**
 * @param {core.App} app
 * @param {string} userId
 * @param {{ skipNotify?: boolean, wasUnpaid?: boolean, ledger?: { kind: string, trainingId?: string, trainingType?: string, trainingDate?: string, actor?: any, withinDailyLimit?: boolean } }} [options]
 */
function restoreMembershipSession(app, userId, options) {
  var skipNotify = options && options.skipNotify;
  var wasUnpaid = options && options.wasUnpaid;
  var user;
  try {
    user = app.findRecordById('users', userId);
  } catch (_) {
    return;
  }
  var membershipType = user.getString('membership_type') || 'regular';
  var unlimited = isUnlimitedMembership(membershipType);
  var usedSessions = user.getFloat('used_sessions') || 0;
  var previousAvailable = user.getFloat('available_sessions') || 0;
  var unpaidSessions = user.getFloat('unpaid_sessions') || 0;
  user.set('used_sessions', Math.max(0, usedSessions - 1));
  var newAvailable = previousAvailable;
  if (wasUnpaid) {
    user.set('unpaid_sessions', Math.max(0, unpaidSessions - 1));
  } else if (!unlimited) {
    newAvailable = previousAvailable + 1;
    user.set('available_sessions', newAvailable);
  }
  app.save(user);
  var ledger = options && options.ledger ? Object.assign({}, options.ledger) : null;
  if (ledger && unlimited && !wasUnpaid) {
    ledger.withinDailyLimit = true;
  }
  if (wasUnpaid && ledger) {
    clearReturnedDebtBooking(app, userId, ledger.trainingId);
  }
  logLedger(
    app,
    userId,
    (wasUnpaid || !unlimited) ? 1 : 0,
    !!wasUnpaid,
    newAvailable,
    ledger
  );
  if (!skipNotify) {
    try {
      var nlib = require(__hooks + '/notificationslib.js');
      nlib.maybeNotifySessionsLeft(app, userId, previousAvailable, newAvailable, membershipType);
    } catch (_) {}
  }
}

function notifyTrainingCancelled(training) {
  var tpl = require(__hooks + '/templatelib.js');
  var bot = require(__hooks + '/botlib.js');
  if (!bot.isBotNotifyEnabled('training_deleted_enabled')) return;
  var typeWord = training.getString('type') === 'tournament' ? 'турнир' : 'тренировка';
  var dateFormatted = bot.formatDateTimeGmt7(training.getString('date'));
  var resolved = tpl.resolve($app, 'bot.training_cancelled', {
    type: typeWord,
    date: dateFormatted
  });
  if (!resolved || !resolved.body) return;
  bot.broadcastToAllUsers(resolved.body);
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
    var unpaidUsers = training.get('unpaid_booked_users') || [];
    var attendedSet = {};
    var unpaidSet = {};
    var i;
    for (i = 0; i < attendedUsers.length; i++) {
      attendedSet[String(attendedUsers[i])] = true;
    }
    for (i = 0; i < unpaidUsers.length; i++) {
      unpaidSet[String(unpaidUsers[i])] = true;
    }
    for (i = 0; i < bookedUsers.length; i++) {
      var uid = String(bookedUsers[i]);
      restoreMembershipSession($app, uid, {
        skipNotify: true,
        wasUnpaid: !!unpaidSet[uid],
        ledger: {
          kind: 'training_cancelled',
          trainingId: training.id,
          trainingType: training.getString('type') || '',
          trainingDate: training.getString('date'),
          actor: null
        }
      });
      if (attendedSet[uid]) {
        try {
          var u = $app.findRecordById('users', uid);
          var cnt = u.getFloat('attendance_count') || 0;
          u.set('attendance_count', Math.max(0, cnt - 1));
          $app.save(u);
        } catch (_) {}
      }
    }
    clearTrainingsBookingsForTraining($app, training.id);
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

/** Формат дат в PB-БД: 'YYYY-MM-DD HH:MM:SS.sssZ' (с пробелом; 'T' ломает строковое сравнение). */
function toPbDateString(d) {
  return d.toISOString().replace('T', ' ');
}

/** Границы календарного дня GMT+7 (лимит «1 в день» для annual/corporate). */
function dayBoundsIso(dateStr) {
  var day = parsePbDate(dateStr);
  if (!day || isNaN(day.getTime())) return null;
  var OFFSET = 7 * 60 * 60 * 1000;
  var DAY = 24 * 60 * 60 * 1000;
  var startMs = Math.floor((day.getTime() + OFFSET) / DAY) * DAY - OFFSET;
  return {
    from: toPbDateString(new Date(startMs)),
    to: toPbDateString(new Date(startMs + DAY - 1))
  };
}

/**
 * @param {core.App} app
 * @param {string} userId
 * @param {string} trainingDate
 * @param {string} trainingId
 */
function hasDailyBookingSameDay(app, userId, trainingDate, trainingId) {
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
 * @param {{ skipEligibilityChecks?: boolean, ledger?: { kind: string, trainingId?: string, trainingType?: string, trainingDate?: string, actor?: any, withinDailyLimit?: boolean } }} [options]
 * @returns {boolean} true — запись ушла в unpaid_sessions
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
    if (user.getBool('membership_stopped')) {
      throw new BadRequestError('Абонемент пользователя остановлен. Запись невозможна.');
    }
  }

  var membershipType = user.getString('membership_type') || 'regular';
  var unlimited = isUnlimitedMembership(membershipType);
  var previousAvailable = user.getFloat('available_sessions') || 0;
  var unpaidSessions = user.getFloat('unpaid_sessions') || 0;
  var wasUnpaid = false;
  var withinDailyLimit = false;
  var newAvailable = previousAvailable;

  if (unlimited) {
    if (isDailyLimitedMembership(membershipType) && hasDailyBookingSameDay(app, userId, trainingDate, trainingId)) {
      wasUnpaid = true;
      withinDailyLimit = false;
      user.set('unpaid_sessions', unpaidSessions + 1);
    } else {
      withinDailyLimit = true;
    }
  } else if (previousAvailable > 0) {
    newAvailable = previousAvailable - 1;
    user.set('available_sessions', newAvailable);
  } else if (membershipType === 'one_time') {
    wasUnpaid = true;
    user.set('unpaid_sessions', unpaidSessions + 1);
  } else {
    throw new BadRequestError('Нет доступных посещений. Обратитесь к тренеру.');
  }

  var usedSessions = user.getFloat('used_sessions') || 0;
  user.set('used_sessions', usedSessions + 1);
  app.save(user);

  var ledger = options && options.ledger ? Object.assign({}, options.ledger) : null;
  if (ledger && withinDailyLimit) {
    ledger.withinDailyLimit = true;
  }

  logLedger(
    app,
    userId,
    (wasUnpaid || !unlimited) ? -1 : 0,
    wasUnpaid,
    newAvailable,
    ledger
  );

  try {
    var nlib = require(__hooks + '/notificationslib.js');
    nlib.maybeNotifySessionsLeft(app, userId, previousAvailable, newAvailable, membershipType);
  } catch (_) {}

  return wasUnpaid;
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
/** Временный флаг: remapping user id при claim MAX без списания/возврата сессий. */
var skipBookingSideEffectsDepth = 0;

/**
 * @param {Function} fn
 * @returns {*}
 */
function withSkipBookingSideEffects(fn) {
  skipBookingSideEffectsDepth += 1;
  try {
    return fn();
  } finally {
    skipBookingSideEffectsDepth -= 1;
  }
}

/** Поля, которые обычный user может менять (запись/снятие себя). */
var TRAINING_USER_EDITABLE = {
  booked_users: true,
  unbooked_users: true
};

var TRAINING_COMPARE_FIELDS = [
  'date', 'duration', 'type', 'max_slots', 'location', 'description',
  'is_deleted', 'is_closed', 'is_cancelled', 'delete_pending_at',
  'booked_users', 'attended_users', 'unbooked_users', 'unpaid_booked_users',
  'moderator_kicked_users', 'restore_insufficient_users', 'coaches',
  'reminder_4h_sent', 'completion_notified'
];

function trainingFieldChanged(original, record, f) {
  if (f === 'is_deleted' || f === 'is_closed' || f === 'is_cancelled' ||
      f === 'reminder_4h_sent' || f === 'completion_notified') {
    return original.getBool(f) !== record.getBool(f);
  }
  if (f === 'duration' || f === 'max_slots') {
    return Number(original.get(f) || 0) !== Number(record.get(f) || 0);
  }
  if (f === 'booked_users' || f === 'attended_users' || f === 'unbooked_users' ||
      f === 'unpaid_booked_users' || f === 'moderator_kicked_users' ||
      f === 'restore_insufficient_users' || f === 'coaches') {
    var aRel = original.get(f);
    var bRel = record.get(f);
    var aS = '';
    var bS = '';
    try { aS = JSON.stringify(aRel == null ? [] : aRel); } catch (_) { aS = String(aRel); }
    try { bS = JSON.stringify(bRel == null ? [] : bRel); } catch (_) { bS = String(bRel); }
    return aS !== bS;
  }
  return String(original.getString(f) || '') !== String(record.getString(f) || '');
}

function isTrainingPrivilegedAuth(auth) {
  if (!auth) return false;
  try {
    if (typeof auth.isSuperuser === 'function' && auth.isSuperuser()) return true;
  } catch (_) { /* ignore */ }
  try {
    if (auth.collection && auth.collection().name === '_superusers') return true;
  } catch (_) { /* ignore */ }
  return !!(auth.getString && auth.getString('role') === 'moderator');
}

/**
 * Non-moderator: только booking-поля; нельзя cancel/delete/meta тренировки.
 * @param {any} original
 * @param {any} record
 * @param {any} auth
 */
function assertTrainingUpdateAllowed(original, record, auth) {
  if (isTrainingPrivilegedAuth(auth)) return;

  for (var i = 0; i < TRAINING_COMPARE_FIELDS.length; i++) {
    var f = TRAINING_COMPARE_FIELDS[i];
    if (!trainingFieldChanged(original, record, f)) continue;
    if (TRAINING_USER_EDITABLE[f]) continue;
    // auto_close на UpdateRequest выставляет is_closed только для уже начавшихся —
    // закрытие будущей тренировки non-mod запрещено.
    if (f === 'is_closed' && !original.getBool('is_closed') && record.getBool('is_closed')) {
      var dateStr = original.getString('date') || record.getString('date');
      var started = false;
      if (dateStr) {
        var startAt = new Date(String(dateStr).replace(' ', 'T'));
        started = !isNaN(startAt.getTime()) && startAt <= new Date();
      }
      if (started) continue;
    }
    throw new ForbiddenError('Изменение поля "' + f + '" недоступно');
  }
}

/** UNIQUE(training,user) conflict → уже есть бронь (идемпотентный add). */
function isBookingUniqueConflict(err) {
  var msg = String((err && err.message) || err || '').toLowerCase();
  if (msg.indexOf('unique') >= 0) return true;
  if (msg.indexOf('validation_not_unique') >= 0) return true;
  try {
    var data = err && (err.data || (err.response && err.response.data));
    if (data) {
      var keys = ['training', 'user', 'id'];
      for (var i = 0; i < keys.length; i++) {
        var cell = data[keys[i]];
        if (cell && String(cell.code || '') === 'validation_not_unique') return true;
      }
    }
  } catch (_) { /* ignore */ }
  return false;
}

/**
 * @param {core.App} app
 * @param {string} trainingId
 * @returns {number}
 */
function countTrainingsBookings(app, trainingId) {
  var row = new DynamicModel({ n: 0 });
  app.db().newQuery(
    'SELECT COUNT(*) as n FROM trainings_bookings WHERE training = {:tid}'
  ).bind({ tid: String(trainingId) }).one(row);
  return Number(row.n) || 0;
}

/**
 * @param {core.App} app
 * @param {string} trainingId
 * @returns {string[]}
 */
function listTrainingsBookingUserIds(app, trainingId) {
  var rows = [];
  try {
    rows = app.findRecordsByFilter(
      'trainings_bookings',
      'training = "' + String(trainingId).replace(/"/g, '') + '"',
      'created',
      0,
      0
    ) || [];
  } catch (err) {
    console.log('[trainingslib] listTrainingsBookingUserIds: ' + err);
    return [];
  }
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    out.push(String(rows[i].getString('user') || rows[i].get('user') || ''));
  }
  return out.filter(Boolean);
}

/**
 * Backfill INSERT OR IGNORE из denormalized booked_users (миграция / догон).
 * @param {core.App} app
 * @param {string} trainingId
 * @param {string[]} userIds
 */
function backfillTrainingsBookings(app, trainingId, userIds) {
  var ids = normalizeRelationIds(userIds || []);
  if (!ids.length) return;
  var collection;
  try {
    collection = app.findCollectionByNameOrId('trainings_bookings');
  } catch (err) {
    console.log('[trainingslib] trainings_bookings missing: ' + err);
    return;
  }
  for (var i = 0; i < ids.length; i++) {
    var uid = String(ids[i]);
    if (!uid) continue;
    try {
      var existing = app.findFirstRecordByFilter(
        'trainings_bookings',
        'training = "' + String(trainingId).replace(/"/g, '') +
          '" && user = "' + uid.replace(/"/g, '') + '"'
      );
      if (existing) continue;
    } catch (_) { /* not found — создаём */ }
    try {
      var rec = new Record(collection);
      rec.set('training', String(trainingId));
      rec.set('user', uid);
      app.save(rec);
    } catch (saveErr) {
      if (!isBookingUniqueConflict(saveErr)) {
        console.log('[trainingslib] backfill booking: ' + saveErr);
      }
    }
  }
}

/**
 * Атомарный claim слота: UNIQUE + post-insert capacity.
 * @returns {'inserted'|'exists'}
 */
function claimTrainingsBooking(app, trainingId, userId, maxSlots) {
  var tid = String(trainingId);
  var uid = String(userId);
  try {
    var already = app.findFirstRecordByFilter(
      'trainings_bookings',
      'training = "' + tid.replace(/"/g, '') + '" && user = "' + uid.replace(/"/g, '') + '"'
    );
    if (already) return 'exists';
  } catch (_) { /* not found */ }

  var collection = app.findCollectionByNameOrId('trainings_bookings');
  var rec = new Record(collection);
  rec.set('training', tid);
  rec.set('user', uid);
  try {
    app.save(rec);
  } catch (err) {
    if (isBookingUniqueConflict(err)) return 'exists';
    throw err;
  }

  var count = countTrainingsBookings(app, tid);
  if (maxSlots > 0 && count > maxSlots) {
    try { app.delete(rec); } catch (_) { /* ignore */ }
    throw new BadRequestError('Нет свободных мест');
  }
  return 'inserted';
}

/**
 * Удаление брони; false = уже не было (идемпотентный unbook, 3.4).
 * @returns {boolean}
 */
function releaseTrainingsBooking(app, trainingId, userId) {
  var tid = String(trainingId).replace(/"/g, '');
  var uid = String(userId).replace(/"/g, '');
  var row;
  try {
    row = app.findFirstRecordByFilter(
      'trainings_bookings',
      'training = "' + tid + '" && user = "' + uid + '"'
    );
  } catch (_) {
    return false;
  }
  if (!row) return false;
  try {
    app.delete(row);
    return true;
  } catch (err) {
    console.log('[trainingslib] releaseTrainingsBooking: ' + err);
    return false;
  }
}

/**
 * Удалить все брони тренировки (финальная отмена).
 * @param {core.App} app
 * @param {string} trainingId
 */
function clearTrainingsBookingsForTraining(app, trainingId) {
  var tid = String(trainingId).replace(/"/g, '');
  var rows;
  try {
    rows = app.findRecordsByFilter('trainings_bookings', 'training = "' + tid + '"', '', 0, 0) || [];
  } catch (_) {
    return;
  }
  for (var i = 0; i < rows.length; i++) {
    try { app.delete(rows[i]); } catch (_) { /* ignore */ }
  }
}

/**
 * Подтянуть denormalized booked_users к таблице (heal после гонки last-write-wins).
 * @param {core.App} app
 * @param {core.Record} training
 * @returns {boolean} true если массив изменили
 */
function syncBookedUsersFromBookingsTable(app, training) {
  if (!training || !training.id) return false;
  var current = normalizeRelationIds(training.get('booked_users') || []);
  var fromTable = listTrainingsBookingUserIds(app, training.id);
  // Таблица ещё пуста (до bootstrap) — догоняем из массива, не затираем кэш.
  if (!fromTable.length && current.length) {
    backfillTrainingsBookings(app, training.id, current);
    return false;
  }
  if (fromTable.length === current.length) {
    var set = {};
    for (var i = 0; i < current.length; i++) set[current[i]] = true;
    var same = true;
    for (var j = 0; j < fromTable.length; j++) {
      if (!set[fromTable[j]]) { same = false; break; }
    }
    if (same) return false;
  }
  training.set('booked_users', fromTable);
  return true;
}

/**
 * Одноразовая/bootstrap миграция: booked_users → trainings_bookings (INSERT OR IGNORE).
 * @param {core.App} app
 * @returns {{ trainings: number, insertedApprox: number }}
 */
function syncAllTrainingsBookingsFromArrays(app) {
  var trainings = [];
  try {
    trainings = app.findRecordsByFilter('trainings', '', '', 0, 0) || [];
  } catch (err) {
    console.log('[trainingslib] syncAll find trainings: ' + err);
    return { trainings: 0, insertedApprox: 0 };
  }
  var n = 0;
  for (var i = 0; i < trainings.length; i++) {
    var booked = normalizeRelationIds(trainings[i].get('booked_users') || []);
    if (!booked.length) continue;
    var before = countTrainingsBookings(app, trainings[i].id);
    backfillTrainingsBookings(app, trainings[i].id, booked);
    var after = countTrainingsBookings(app, trainings[i].id);
    n += Math.max(0, after - before);
  }
  return { trainings: trainings.length, insertedApprox: n };
}

function applyBookingSideEffects(original, record, auth) {
  if (skipBookingSideEffectsDepth > 0) return;

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

  // --- IDOR: обычный пользователь — только себя во всех relation-полях;
  // посещаемость — только модератор. Без обхода через cancel/restore transition.
  // auth == null: внутренний/system вызов (skipBooking / compat) — не режем.
  if (auth && !isModerator) {
    // Temporal / state guards: нельзя записаться на cancelled/closed/ended
    // и нельзя снять запись после окончания (возврат сессии).
    if (added.length || removed.length) {
      if (record.getBool('is_cancelled') || original.getBool('is_cancelled')) {
        throw new ForbiddenError('Тренировка отменена');
      }
      var endedForGuard = hasTimeRangeEnded(
        original.getString('date') || record.getString('date'),
        original.getFloat('duration') || record.getFloat('duration') || 0
      );
      if (added.length) {
        if (record.getBool('is_closed') || original.getBool('is_closed') || endedForGuard) {
          throw new ForbiddenError('Запись закрыта или тренировка уже прошла');
        }
      }
      if (removed.length && endedForGuard) {
        throw new ForbiddenError('Тренировка уже завершилась — отмена записи недоступна');
      }
    }
    var relationChecks = [
      { added: added, removed: removed, selfOnly: true, labelAdd: 'Можно записать только себя', labelRem: 'Можно снять с записи только себя' },
      {
        added: audit.newlyAdded(original.get('unbooked_users'), record.get('unbooked_users')),
        removed: audit.newlyRemoved(original.get('unbooked_users'), record.get('unbooked_users')),
        selfOnly: true,
        labelAdd: 'Можно менять unbooked_users только для себя',
        labelRem: 'Можно менять unbooked_users только для себя'
      },
      {
        added: audit.newlyAdded(original.get('unpaid_booked_users'), record.get('unpaid_booked_users')),
        removed: audit.newlyRemoved(original.get('unpaid_booked_users'), record.get('unpaid_booked_users')),
        forbid: true,
        label: 'unpaid_booked_users — только система/модератор'
      },
      {
        added: audit.newlyAdded(original.get('moderator_kicked_users'), record.get('moderator_kicked_users')),
        removed: audit.newlyRemoved(original.get('moderator_kicked_users'), record.get('moderator_kicked_users')),
        forbid: true,
        label: 'moderator_kicked_users — только модератор'
      },
      {
        added: audit.newlyAdded(original.get('restore_insufficient_users'), record.get('restore_insufficient_users')),
        removed: audit.newlyRemoved(original.get('restore_insufficient_users'), record.get('restore_insufficient_users')),
        forbid: true,
        label: 'restore_insufficient_users — только модератор'
      }
    ];
    for (var rc = 0; rc < relationChecks.length; rc++) {
      var check = relationChecks[rc];
      if (check.forbid) {
        if ((check.added && check.added.length) || (check.removed && check.removed.length)) {
          throw new ForbiddenError(check.label);
        }
        continue;
      }
      if (check.added && check.added.length) {
        for (i = 0; i < check.added.length; i++) {
          if (String(check.added[i]) !== authId) {
            throw new ForbiddenError(check.labelAdd);
          }
        }
      }
      if (check.removed && check.removed.length) {
        for (i = 0; i < check.removed.length; i++) {
          if (String(check.removed[i]) !== authId) {
            throw new ForbiddenError(check.labelRem);
          }
        }
      }
    }
    if (attendedAdded.length || attendedRemoved.length) {
      throw new ForbiddenError('Отметка посещения — только модератор');
    }
  }

  // Лимит мест — источник правды trainings_bookings (пере-чек внутри TX, 3.3/3.5).
  // Ранний отказ по клиентскому снимку — только быстрый fail; гонки закрывает claimTrainingsBooking.
  var maxSlots = record.getFloat('max_slots') || 0;
  if (maxSlots > 0 && added.length) {
    var tentativeCount = audit.newlyAdded([], record.get('booked_users')).length;
    if (tentativeCount > maxSlots) {
      throw new BadRequestError('Нет свободных мест');
    }
  }

  // Повторная запись: снять добавленных из kicked/insufficient (сервер, не client PATCH).
  if (added.length) {
    var kickedNow = audit.newlyAdded([], record.get('moderator_kicked_users') || []);
    var insuffNow = audit.newlyAdded([], record.get('restore_insufficient_users') || []);
    var nextKickedAuto = [];
    for (i = 0; i < kickedNow.length; i++) {
      var kid = String(kickedNow[i]);
      var wasAdded = false;
      for (var ai = 0; ai < added.length; ai++) {
        if (String(added[ai]) === kid) { wasAdded = true; break; }
      }
      if (!wasAdded) nextKickedAuto.push(kickedNow[i]);
    }
    var nextInsuffAuto = [];
    for (i = 0; i < insuffNow.length; i++) {
      var iid = String(insuffNow[i]);
      var wasAddedI = false;
      for (var bi = 0; bi < added.length; bi++) {
        if (String(added[bi]) === iid) { wasAddedI = true; break; }
      }
      if (!wasAddedI) nextInsuffAuto.push(insuffNow[i]);
    }
    if (nextKickedAuto.length !== kickedNow.length) {
      record.set('moderator_kicked_users', nextKickedAuto);
    }
    if (nextInsuffAuto.length !== insuffNow.length) {
      record.set('restore_insufficient_users', nextInsuffAuto);
    }
  }

  var hasWork =
    isCancelTransition ||
    isRestoreTransition ||
    added.length ||
    removed.length ||
    attendedAdded.length ||
    attendedRemoved.length;
  if (!hasWork) return;

  var trainingType = '';
  try {
    trainingType = String(record.getString('type') || original.getString('type') || '');
  } catch (_) {
    trainingType = '';
  }

  function ledgerCtx(kind) {
    return {
      kind: kind,
      trainingId: trainingId,
      trainingType: trainingType,
      trainingDate: trainingDate,
      actor: auth || null
    };
  }

  var unpaidOriginal = audit.newlyAdded([], original.get('unpaid_booked_users') || []);
  var unpaidSet = {};
  for (i = 0; i < unpaidOriginal.length; i++) {
    unpaidSet[String(unpaidOriginal[i])] = true;
  }

  $app.runInTransaction(function (txApp) {
    // Догон таблицы из текущего booked_users (после import / до bootstrap).
    backfillTrainingsBookings(
      txApp,
      trainingId,
      audit.newlyAdded([], original.get('booked_users') || [])
    );

    if (isCancelTransition) {
      if (!ended) {
        var cancelBooked = listTrainingsBookingUserIds(txApp, trainingId);
        if (!cancelBooked.length) {
          cancelBooked = audit.newlyAdded([], original.get('booked_users'));
        }
        var cancelAttended = audit.newlyAdded([], original.get('attended_users'));
        var cancelAttendedSet = {};
        for (i = 0; i < cancelAttended.length; i++) {
          cancelAttendedSet[String(cancelAttended[i])] = true;
        }
        for (i = 0; i < cancelBooked.length; i++) {
          var cancelUid = String(cancelBooked[i]);
          restoreMembershipSession(txApp, cancelUid, {
            skipNotify: true,
            wasUnpaid: !!unpaidSet[cancelUid],
            ledger: ledgerCtx('training_cancelled')
          });
          if (cancelAttendedSet[cancelUid]) {
            adjustAttendanceCountTx(txApp, cancelUid, -1);
          }
        }
      }
      return;
    }

    if (isRestoreTransition) {
      if (!ended) {
        var restoreBooked = listTrainingsBookingUserIds(txApp, trainingId);
        if (!restoreBooked.length) {
          restoreBooked = audit.newlyAdded([], record.get('booked_users'));
          backfillTrainingsBookings(txApp, trainingId, restoreBooked);
        }
        var restoreAttended = audit.newlyAdded([], record.get('attended_users'));
        var restoreUnpaid = [];
        for (i = 0; i < restoreBooked.length; i++) {
          var restoreWasUnpaid = consumeMembershipSessionTx(
            txApp,
            restoreBooked[i],
            true,
            trainingDate,
            trainingId,
            { skipEligibilityChecks: true, ledger: ledgerCtx('training_restored') }
          );
          if (restoreWasUnpaid) restoreUnpaid.push(String(restoreBooked[i]));
        }
        record.set('unpaid_booked_users', restoreUnpaid);
        for (i = 0; i < restoreAttended.length; i++) {
          adjustAttendanceCountTx(txApp, restoreAttended[i], 1);
        }
      }
      return;
    }

    var nextUnpaid = unpaidOriginal.slice();
    for (i = 0; i < added.length; i++) {
      var addUid = String(added[i]);
      var claim = claimTrainingsBooking(txApp, trainingId, addUid, maxSlots);
      if (claim === 'exists') {
        // Уже в таблице — не списываем сессию повторно (гонка / retry).
        continue;
      }
      var addedUnpaid = consumeMembershipSessionTx(
        txApp,
        addUid,
        isModerator,
        trainingDate,
        trainingId,
        { ledger: ledgerCtx('booking') }
      );
      if (addedUnpaid && nextUnpaid.indexOf(addUid) < 0) {
        nextUnpaid.push(addUid);
      }
    }
    for (i = 0; i < removed.length; i++) {
      var remUid = String(removed[i]);
      // Идемпотентный unbook: refund только если строка брони реально удалена.
      if (!releaseTrainingsBooking(txApp, trainingId, remUid)) {
        continue;
      }
      restoreMembershipSession(txApp, remUid, {
        wasUnpaid: !!unpaidSet[remUid],
        ledger: ledgerCtx('unbook')
      });
      nextUnpaid = nextUnpaid.filter(function (id) {
        return String(id) !== remUid;
      });
    }
    record.set('unpaid_booked_users', nextUnpaid);
    // booked_users = проекция таблицы (не клиентский RMW-снимок).
    if (added.length || removed.length) {
      record.set('booked_users', listTrainingsBookingUserIds(txApp, trainingId));
    }
    for (i = 0; i < attendedAdded.length; i++) {
      adjustAttendanceCountTx(txApp, attendedAdded[i], 1);
    }
    for (i = 0; i < attendedRemoved.length; i++) {
      adjustAttendanceCountTx(txApp, attendedRemoved[i], -1);
    }
  });
}

/**
 * Снять пользователя со всех ещё не начавшихся тренировок (date > now).
 * $app.save не вызывает onRecordUpdateRequest — сессии возвращаем вручную.
 * @param {core.App} app
 * @param {string} userId
 * @param {{ cause?: 'membership_freeze'|'membership_stop', actor?: any }} [options]
 * @returns {string[]} id тренировок
 */
function unbookNotStartedForUser(app, userId, options) {
  options = options || {};
  var cause = options.cause || 'membership_freeze';
  var actor = options.actor || null;
  var uid = String(userId);
  var now = Date.now();
  var resultIds = [];
  var trainings;
  try {
    trainings = app.findRecordsByFilter(
      'trainings',
      'is_cancelled != true && booked_users ?~ "' + uid + '"',
      '',
      0,
      0
    );
  } catch (err) {
    console.log('[trainingslib] unbookNotStarted find: ' + err);
    return resultIds;
  }

  var bot = require(__hooks + '/botlib.js');
  var userName = options.userName || 'Игрок';
  // не findRecordById('users') — в API-контексте на стенде зависает

  var causeLabel = cause === 'membership_stop'
    ? 'из-за остановки абонемента'
    : 'из-за заморозки абонемента';

  var i;
  for (i = 0; i < trainings.length; i++) {
    var training = trainings[i];
    var start = parsePbDate(training.getString('date'));
    if (!start || isNaN(start.getTime()) || start.getTime() <= now) continue;

    var booked = training.get('booked_users') || [];
    var nextBooked = [];
    var j;
    var found = false;
    for (j = 0; j < booked.length; j++) {
      var bid = '';
      try {
        if (typeof booked[j] === 'string') bid = booked[j];
        else if (booked[j] && booked[j].id) bid = String(booked[j].id);
        else bid = String(booked[j]);
      } catch (_) {
        bid = String(booked[j]);
      }
      if (bid === uid) {
        found = true;
        continue;
      }
      nextBooked.push(bid);
    }
    if (!found) continue;

    var unbooked = training.get('unbooked_users') || [];
    var nextUnbooked = [];
    var hasUnbooked = false;
    for (j = 0; j < unbooked.length; j++) {
      var unId = '';
      try {
        if (typeof unbooked[j] === 'string') unId = unbooked[j];
        else if (unbooked[j] && unbooked[j].id) unId = String(unbooked[j].id);
        else unId = String(unbooked[j]);
      } catch (_) {
        unId = String(unbooked[j]);
      }
      if (unId === uid) hasUnbooked = true;
      nextUnbooked.push(unId);
    }
    if (!hasUnbooked) nextUnbooked.push(uid);

    var unpaidBooked = training.get('unpaid_booked_users') || [];
    var wasUnpaid = false;
    var nextUnpaid = [];
    for (j = 0; j < unpaidBooked.length; j++) {
      var upId = '';
      try {
        if (typeof unpaidBooked[j] === 'string') upId = unpaidBooked[j];
        else if (unpaidBooked[j] && unpaidBooked[j].id) upId = String(unpaidBooked[j].id);
        else upId = String(unpaidBooked[j]);
      } catch (_) {
        upId = String(unpaidBooked[j]);
      }
      if (upId === uid) {
        wasUnpaid = true;
        continue;
      }
      nextUnpaid.push(upId);
    }

    // $app.save минует UpdateRequest — release + sync вручную.
    if (!releaseTrainingsBooking(app, training.id, uid)) {
      // Уже снята в таблице — не дублируем refund; подтянем массив.
      syncBookedUsersFromBookingsTable(app, training);
      try { app.save(training); } catch (_) {}
      continue;
    }
    training.set('booked_users', nextBooked);
    training.set('unbooked_users', nextUnbooked);
    training.set('unpaid_booked_users', nextUnpaid);
    try {
      app.save(training);
    } catch (saveErr) {
      console.log('[trainingslib] unbookNotStarted save: ' + saveErr);
      continue;
    }

    restoreMembershipSession(app, uid, {
      wasUnpaid: wasUnpaid,
      skipNotify: true,
      ledger: {
        kind: 'unbook',
        trainingId: training.id,
        trainingType: training.getString('type') || '',
        trainingDate: training.getString('date') || '',
        actor: actor
      }
    });

    resultIds.push(training.id);

    try {
      var dateFormatted = bot.formatDateTimeGmt7(training.getString('date'));
      var isTournament = training.getString('type') === 'tournament';
      var typeGen = isTournament ? 'турнира' : 'тренировки';
      var text = '*' + userName + '* снят(а) с ' + typeGen + ' *' + dateFormatted +
        '* ' + causeLabel + '. Всего записано: ' + nextBooked.length + '.';
      var settings = null;
      try {
        settings = app.findFirstRecordByFilter('notification_settings', '');
      } catch (_) {}
      if (!settings || settings.getBool('training_booking_enabled') !== false) {
        bot.notifyModerators(text);
      }
    } catch (notifyErr) {
      console.log('[trainingslib] unbookNotStarted notify: ' + notifyErr);
    }

    try {
      var nlib = require(__hooks + '/notificationslib.js');
      nlib.upsertTrainingNotification(uid, training.id, 'farewell');
    } catch (_) {}
  }

  return resultIds;
}

/** relation-поле может вернуть строки id или объекты {id} — нормализуем к строкам. */
function normalizeRelationIds(arr) {
  var out = [];
  var i;
  for (i = 0; i < (arr || []).length; i++) {
    var v = arr[i];
    var id;
    try {
      if (typeof v === 'string') id = v;
      else if (v && v.id) id = String(v.id);
      else id = String(v);
    } catch (_) {
      id = String(v);
    }
    out.push(id);
  }
  return out;
}

/**
 * Синхронизация training.unpaid_booked_users после списания/возврата долга через
 * settle-debt API (membership_ledger_settle.pb.js). findRecordById('trainings') —
 * безопасен на этом стенде (в отличие от findRecordById('users'), который зависает);
 * используется так же read-only в notificationslib.js / bot_notifications.pb.js.
 * Не бросает — ошибка не должна откатывать уже применённое списание долга в ledger.
 * @param {core.App} app
 * @param {string} trainingId
 * @param {string} userId
 * @param {boolean} isUnpaid — true: пометить в долг (undo списания); false: долг погашен
 */
function setTrainingUnpaidFlag(app, trainingId, userId, isUnpaid) {
  if (!trainingId || !userId) return;
  try {
    var training = app.findRecordById('trainings', trainingId);
    var current = normalizeRelationIds(training.get('unpaid_booked_users') || []);
    var uid = String(userId);
    var has = current.indexOf(uid) >= 0;

    if (isUnpaid) {
      // Возврат долга назад (undo): помечаем в долг, только если бронь ещё активна.
      var booked = normalizeRelationIds(training.get('booked_users') || []);
      if (booked.indexOf(uid) < 0) return;
      if (has) return;
      current.push(uid);
    } else {
      if (!has) return;
      current = current.filter(function (id) {
        return id !== uid;
      });
    }

    training.set('unpaid_booked_users', current);
    app.save(training);
  } catch (err) {
    console.log('[trainingslib] setTrainingUnpaidFlag: ' + err);
  }
}

module.exports = {
  FINALIZE_GRACE_MS: FINALIZE_GRACE_MS,
  finalizeCancelledTrainingRecord: finalizeCancelledTrainingRecord,
  isReadyToFinalizePendingDelete: isReadyToFinalizePendingDelete,
  hasTimeRangeEnded: hasTimeRangeEnded,
  assertTrainingUpdateAllowed: assertTrainingUpdateAllowed,
  applyBookingSideEffects: applyBookingSideEffects,
  withSkipBookingSideEffects: withSkipBookingSideEffects,
  restoreMembershipSession: restoreMembershipSession,
  unbookNotStartedForUser: unbookNotStartedForUser,
  setTrainingUnpaidFlag: setTrainingUnpaidFlag,
  backfillTrainingsBookings: backfillTrainingsBookings,
  claimTrainingsBooking: claimTrainingsBooking,
  releaseTrainingsBooking: releaseTrainingsBooking,
  clearTrainingsBookingsForTraining: clearTrainingsBookingsForTraining,
  listTrainingsBookingUserIds: listTrainingsBookingUserIds,
  syncBookedUsersFromBookingsTable: syncBookedUsersFromBookingsTable,
  syncAllTrainingsBookingsFromArrays: syncAllTrainingsBookingsFromArrays,
  // backward-compat alias (если кто-то ещё require'ит старое имя)
  validateBookingAdditions: function (original, record) {
    applyBookingSideEffects(original, record, null);
  }
};
