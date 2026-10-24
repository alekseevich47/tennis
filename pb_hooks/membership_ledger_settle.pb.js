// Списание долга по строке membership_ledger (только moderator).
// Мутации unpaid / unpaid_sessions / debt_settle — только $app.save, не клиентский PATCH.

var BOOKING_KINDS = {
  booking: true,
  training_restored: true
};

function errMessage(err) {
  try {
    if (err && err.message) return String(err.message);
  } catch (_) {}
  try {
    return String(err);
  } catch (_) {
    return 'Unknown error';
  }
}

function apiError(c, status, message) {
  console.log('[membership-settle-debt] ' + status + ' ' + message);
  return c.json(status, { status: status, message: message, data: {} });
}

function findSettleForLedger(app, relatedId) {
  try {
    var rows = app.findRecordsByFilter(
      'membership_ledger',
      'kind = "debt_settle" && related_ledger_id = "' + String(relatedId) + '"',
      '-created',
      10,
      0
    );
    return rows || [];
  } catch (_) {
    return [];
  }
}

routerAdd('POST', '/api/membership-ledger-settle-debt', (c) => {
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) return apiError(c, 401, 'Unauthorized');

    var isMod = false;
    try {
      isMod = auth.getString('role') === 'moderator';
    } catch (_) {
      isMod = false;
    }
    if (!isMod) return apiError(c, 403, 'Forbidden');

    var body = info.body || {};
    var ledgerId = String(body.ledgerId || '');
    var paid = body.paid === true || body.paid === 'true';
    var bodyUserId = body.userId ? String(body.userId) : '';

    if (!ledgerId) return apiError(c, 400, 'Missing ledgerId');

    var entry;
    try {
      entry = $app.findRecordById('membership_ledger', ledgerId);
    } catch (_) {
      return apiError(c, 404, 'Запись истории не найдена');
    }

    var entryUserId = String(entry.getString('user') || entry.get('user') || '');
    if (!entryUserId) return apiError(c, 400, 'Некорректная запись ledger');
    if (bodyUserId && bodyUserId !== entryUserId) {
      return apiError(c, 400, 'userId не совпадает с владельцем записи');
    }

    var kind = String(entry.getString('kind') || '');
    if (!BOOKING_KINDS[kind]) {
      return apiError(c, 400, 'Списание долга доступно только для записей на тренировку');
    }

    var user;
    try {
      user = $app.findRecordById('users', entryUserId);
    } catch (_) {
      return apiError(c, 404, 'Пользователь не найден');
    }

    var ledgerLib = require(__hooks + '/membershipledgerlib.js');
    var unpaidSessions = Number(user.getFloat('unpaid_sessions')) || 0;
    var balanceAfter = Number(user.getFloat('available_sessions')) || 0;

    if (paid) {
      if (!entry.getBool('unpaid')) {
        return apiError(c, 400, 'Долг уже списан');
      }
      entry.set('unpaid', false);
      $app.save(entry);

      user.set('unpaid_sessions', Math.max(0, unpaidSessions - 1));
      $app.save(user);

      ledgerLib.logMovement($app, {
        userId: entryUserId,
        delta: 0,
        kind: 'debt_settle',
        unpaid: false,
        trainingId: entry.getString('training_id') || '',
        trainingType: entry.getString('training_type') || '',
        trainingDate: entry.getString('training_date') || '',
        relatedLedgerId: ledgerId,
        actor: auth,
        balanceAfter: balanceAfter
      });
    } else {
      if (entry.getBool('unpaid')) {
        return apiError(c, 400, 'Долг ещё не списан');
      }
      var settles = findSettleForLedger($app, ledgerId);
      if (!settles.length) {
        return apiError(c, 400, 'Нет связанного списания долга');
      }

      entry.set('unpaid', true);
      $app.save(entry);

      user.set('unpaid_sessions', unpaidSessions + 1);
      $app.save(user);

      var i;
      for (i = 0; i < settles.length; i++) {
        try {
          $app.delete(settles[i]);
        } catch (delErr) {
          console.log('[membership-settle-debt] delete settle: ' + delErr);
        }
      }
    }

    return c.json(200, {
      ok: true,
      ledgerId: ledgerId,
      paid: paid,
      unpaid_sessions: Number(user.getFloat('unpaid_sessions')) || 0
    });
  } catch (err) {
    return apiError(c, 400, errMessage(err));
  }
});
