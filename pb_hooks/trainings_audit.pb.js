// Серверный аудит «Запись»: trainings (коллекция audit_events).
// PB-хуки: helper вне callback недоступен — логика inline в каждом обработчике.

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var bot = require(__hooks + '/botlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var dateStr = record.getString('date');
    var location = record.getString('location') || '';
    var dateFormatted = dateStr ? bot.formatDateTimeGmt7(String(dateStr).replace(' ', 'T')) : '';
    var objectLabel = (dateFormatted && location)
      ? (dateFormatted + ', ' + location)
      : (dateFormatted || location || record.id);
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'booking',
      action: 'booking.training.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'training',
      objectId: record.id,
      objectLabel: objectLabel,
      effectiveAt: dateStr || undefined,
      details: { trainingId: record.id },
      summaryRu: name + ' создал(а) тренировку ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[trainings-audit] create: ' + err);
  }
}, 'trainings');

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var bot = require(__hooks + '/botlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var authId = auth && auth.id ? auth.id : '';
    var dateStr = record.getString('date') || original.getString('date');
    var location = record.getString('location') || original.getString('location') || '';
    var dateFormatted = dateStr ? bot.formatDateTimeGmt7(String(dateStr).replace(' ', 'T')) : '';
    var objectLabel = (dateFormatted && location)
      ? (dateFormatted + ', ' + location)
      : (dateFormatted || location || record.id);
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    function userLabel(userId) {
      try {
        var u = $app.findRecordById('users', userId);
        return u.getString('full_name') || 'Игрок';
      } catch (_) {
        return 'Игрок';
      }
    }

    var basePayload = {
      category: 'booking',
      objectType: 'training',
      objectId: record.id,
      objectLabel: objectLabel,
      effectiveAt: dateStr || undefined,
      details: { trainingId: record.id }
    };

    var wasDeleted = original.getBool('is_deleted');
    var isDeleted = record.getBool('is_deleted');
    var wasCancelled = original.getBool('is_cancelled');
    var isCancelled = record.getBool('is_cancelled');
    var wasClosed = original.getBool('is_closed');
    var isClosed = record.getBool('is_closed');
    var mainLogged = false;

    if (!wasDeleted && isDeleted) {
      audit.logEvent($app, Object.assign({}, basePayload, {
        action: 'booking.training.delete',
        actionKind: 'delete',
        subject: subject,
        summaryRu: name + ' удалил(а) тренировку ' + objectLabel,
        severity: 'warning'
      }));
      mainLogged = true;
    } else if (wasDeleted && !isDeleted) {
      audit.logEvent($app, Object.assign({}, basePayload, {
        action: 'booking.training.restore',
        actionKind: 'restore',
        subject: subject,
        summaryRu: name + ' восстановил(а) тренировку ' + objectLabel,
        severity: 'info'
      }));
      mainLogged = true;
    } else if (!wasCancelled && isCancelled) {
      audit.logEvent($app, Object.assign({}, basePayload, {
        action: 'booking.training.delete',
        actionKind: 'delete',
        subject: subject,
        summaryRu: name + ' окончательно отменил(а) тренировку ' + objectLabel,
        severity: 'warning'
      }));
      mainLogged = true;
    } else if (!wasClosed && isClosed) {
      audit.logEvent($app, Object.assign({}, basePayload, {
        action: 'booking.enrollment.close',
        actionKind: 'update',
        subject: subject,
        summaryRu: name + ' закрыл(а) запись на тренировку ' + objectLabel,
        severity: 'info'
      }));
      mainLogged = true;
    } else if (wasClosed && !isClosed) {
      audit.logEvent($app, Object.assign({}, basePayload, {
        action: 'booking.enrollment.open',
        actionKind: 'update',
        subject: subject,
        summaryRu: name + ' открыл(а) запись на тренировку ' + objectLabel,
        severity: 'info'
      }));
      mainLogged = true;
    } else if (!mainLogged) {
      var diff = audit.diffFields(original, record, [
        'date', 'location', 'duration', 'type', 'max_slots', 'description'
      ]);
      if (diff.length) {
        audit.logEvent($app, Object.assign({}, basePayload, {
          action: 'booking.training.update',
          actionKind: 'update',
          subject: subject,
          diff: diff,
          summaryRu: name + ' изменил(а) тренировку ' + objectLabel,
          severity: 'info'
        }));
      }
    }

    var addedBooked = audit.newlyAdded(original.get('booked_users'), record.get('booked_users'));
    var totalBookedCount = audit.newlyAdded([], record.get('booked_users')).length;
    var bookedSuffix = '. Всего записано: ' + totalBookedCount + '.';
    var i;
    for (i = 0; i < addedBooked.length; i++) {
      var bookedUserId = addedBooked[i];
      var bookedLabel = userLabel(bookedUserId);
      if (bookedUserId === authId) {
        audit.logEvent($app, Object.assign({}, basePayload, {
          action: 'booking.booking.create_self',
          actionKind: 'create',
          subject: subject,
          details: { trainingId: record.id, totalBookedCount: totalBookedCount },
          summaryRu: name + ' записался(ась) на тренировку ' + objectLabel + bookedSuffix,
          severity: 'info'
        }));
      } else {
        var modSubject = audit.actorInfo(auth);
        if (modSubject) modSubject.source = 'moderator';
        audit.logEvent($app, Object.assign({}, basePayload, {
          action: 'booking.booking.create_moderator',
          actionKind: 'create',
          subject: modSubject,
          target: { id: bookedUserId, label: bookedLabel },
          details: { trainingId: record.id, totalBookedCount: totalBookedCount },
          summaryRu: name + ' записал(а) ' + bookedLabel + ' на тренировку ' + objectLabel + bookedSuffix,
          severity: 'info'
        }));
      }
    }

    var addedUnbooked = audit.newlyAdded(original.get('unbooked_users'), record.get('unbooked_users'));
    var addedInsufficient = audit.newlyAdded(
      original.get('restore_insufficient_users'),
      record.get('restore_insufficient_users')
    );
    var insufficientSet = {};
    for (i = 0; i < addedInsufficient.length; i++) {
      insufficientSet[addedInsufficient[i]] = true;
    }

    for (i = 0; i < addedUnbooked.length; i++) {
      var unbookedUserId = addedUnbooked[i];
      var unbookedLabel = userLabel(unbookedUserId);
      if (insufficientSet[unbookedUserId]) {
        audit.logEvent($app, Object.assign({}, basePayload, {
          action: 'booking.booking.cancel_system',
          actionKind: 'delete',
          subject: null,
          subjectSource: 'system',
          target: { id: unbookedUserId, label: unbookedLabel },
          details: { trainingId: record.id, reason: 'insufficient_sessions' },
          summaryRu: 'Система сняла ' + unbookedLabel + ' с тренировки ' + objectLabel + ' (недостаточно посещений)',
          severity: 'info'
        }));
      } else if (unbookedUserId === authId) {
        audit.logEvent($app, Object.assign({}, basePayload, {
          action: 'booking.booking.cancel_self',
          actionKind: 'delete',
          subject: subject,
          target: { id: unbookedUserId, label: unbookedLabel },
          summaryRu: name + ' снял(а) запись с тренировки ' + objectLabel,
          severity: 'info'
        }));
      } else {
        var kickSubject = audit.actorInfo(auth);
        if (kickSubject) kickSubject.source = 'moderator';
        audit.logEvent($app, Object.assign({}, basePayload, {
          action: 'booking.booking.cancel_moderator',
          actionKind: 'delete',
          subject: kickSubject,
          target: { id: unbookedUserId, label: unbookedLabel },
          summaryRu: name + ' снял(а) ' + unbookedLabel + ' с тренировки ' + objectLabel,
          severity: 'info'
        }));
      }
    }

    var addedAttended = audit.newlyAdded(original.get('attended_users'), record.get('attended_users'));
    for (i = 0; i < addedAttended.length; i++) {
      var attendedUserId = addedAttended[i];
      var attendedLabel = userLabel(attendedUserId);
      var markSubject = audit.actorInfo(auth);
      if (markSubject) markSubject.source = 'moderator';
      audit.logEvent($app, Object.assign({}, basePayload, {
        action: 'booking.attendance.mark',
        actionKind: 'update',
        subject: markSubject,
        target: { id: attendedUserId, label: attendedLabel },
        summaryRu: name + ' отметил(а) явку ' + attendedLabel + ' на тренировке ' + objectLabel,
        severity: 'info'
      }));
    }

    var removedAttended = audit.newlyRemoved(original.get('attended_users'), record.get('attended_users'));
    for (i = 0; i < removedAttended.length; i++) {
      var unmarkUserId = removedAttended[i];
      var unmarkLabel = userLabel(unmarkUserId);
      var unmarkSubject = audit.actorInfo(auth);
      if (unmarkSubject) unmarkSubject.source = 'moderator';
      audit.logEvent($app, Object.assign({}, basePayload, {
        action: 'booking.attendance.unmark',
        actionKind: 'update',
        subject: unmarkSubject,
        target: { id: unmarkUserId, label: unmarkLabel },
        summaryRu: name + ' снял(а) явку ' + unmarkLabel + ' на тренировке ' + objectLabel,
        severity: 'info'
      }));
    }
  } catch (err) {
    console.log('[trainings-audit] update: ' + err);
  }
}, 'trainings');

onRecordDeleteRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var bot = require(__hooks + '/botlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var dateStr = record.getString('date');
    var location = record.getString('location') || '';
    var dateFormatted = dateStr ? bot.formatDateTimeGmt7(String(dateStr).replace(' ', 'T')) : '';
    var objectLabel = (dateFormatted && location)
      ? (dateFormatted + ', ' + location)
      : (dateFormatted || location || record.id);
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'booking',
      action: 'booking.training.delete',
      actionKind: 'delete',
      subject: subject,
      objectType: 'training',
      objectId: record.id,
      objectLabel: objectLabel,
      effectiveAt: dateStr || undefined,
      details: { trainingId: record.id },
      summaryRu: name + ' окончательно удалил(а) тренировку ' + objectLabel,
      severity: 'warning'
    });
  } catch (err) {
    console.log('[trainings-audit] delete: ' + err);
  }
}, 'trainings');
