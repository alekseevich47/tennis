// Списание долга по строке membership_ledger (только moderator).
// Без findRecordById('users') — на стенде зависает/opaque 400; unpaid_sessions через SQL.
// Не кидаем BadRequestError — в goja обходит try/catch роутера.

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

function sqlExec(sql, bind, label) {
  try {
    console.log('[membership-settle-debt] sql ' + (label || 'exec'));
    $app.db().newQuery(sql).bind(bind || {}).execute();
    console.log('[membership-settle-debt] sql ' + (label || 'exec') + ' ok');
  } catch (err) {
    console.log('[membership-settle-debt] sql ' + (label || 'exec') + ' err: ' + err);
    throw new Error('SQL ' + (label || 'exec') + ': ' + errMessage(err));
  }
}

function loadLedgerRow(ledgerId) {
  var row = new DynamicModel({
    id: '',
    user: '',
    kind: '',
    unpaid: false,
    training_id: '',
    training_type: '',
    training_date: '',
    delta: 0
  });
  try {
    $app.db().newQuery(
      'SELECT id, user, kind, unpaid, training_id, ' +
        'COALESCE(training_type, \'\') AS training_type, training_date, delta ' +
        'FROM membership_ledger WHERE id = {:id}'
    ).bind({ id: String(ledgerId) }).one(row);
  } catch (err) {
    // training_type может отсутствовать до import schema — fallback без колонки
    try {
      row = new DynamicModel({
        id: '',
        user: '',
        kind: '',
        unpaid: false,
        training_id: '',
        training_type: '',
        training_date: '',
        delta: 0
      });
      $app.db().newQuery(
        'SELECT id, user, kind, unpaid, training_id, training_date, delta ' +
          'FROM membership_ledger WHERE id = {:id}'
      ).bind({ id: String(ledgerId) }).one(row);
      row.training_type = '';
    } catch (err2) {
      console.log('[membership-settle-debt] load ledger err: ' + err2);
      return null;
    }
  }
  return row;
}

function loadUnpaidSessions(userId) {
  var row = new DynamicModel({ unpaid_sessions: 0, available_sessions: 0 });
  try {
    $app.db().newQuery(
      'SELECT unpaid_sessions, available_sessions FROM users WHERE id = {:id}'
    ).bind({ id: String(userId) }).one(row);
  } catch (err) {
    console.log('[membership-settle-debt] load user err: ' + err);
    throw new Error('Пользователь не найден');
  }
  return {
    unpaid: Math.max(0, Math.floor(Number(row.unpaid_sessions) || 0)),
    available: Math.max(0, Number(row.available_sessions) || 0)
  };
}

function findSettleIds(relatedId) {
  var ids = [];
  try {
    var rows = $app.findRecordsByFilter(
      'membership_ledger',
      'kind = "debt_settle" && related_ledger_id = "' + String(relatedId) + '"',
      '-created',
      10,
      0
    );
    var i;
    for (i = 0; i < (rows || []).length; i++) {
      ids.push(String(rows[i].id));
    }
  } catch (err) {
    console.log('[membership-settle-debt] find settle filter: ' + err);
  }
  return ids;
}

function actorName(auth) {
  try {
    return require(__hooks + '/membershipledgerlib.js').actorFullName(auth) || 'Модератор';
  } catch (_) {
    return 'Модератор';
  }
}

function insertDebtSettle(p) {
  var id = '';
  try {
    id = $security.randomStringWithAlphabet(15, 'abcdefghijklmnopqrstuvwxyz0123456789');
  } catch (_) {
    id = String(Date.now()).slice(-10) + 'abcde';
  }
  var actorId = p.actorId || '';
  var name = p.actorName || '';
  var nowIso = new Date().toISOString().replace('T', ' ').replace('Z', 'Z');
  var tdate = p.trainingDate ? String(p.trainingDate) : '';
  // Сначала полный INSERT (после import schema)
  try {
    sqlExec(
      'INSERT INTO membership_ledger ' +
        '(id, user, delta, kind, unpaid, within_daily_limit, training_id, training_type, ' +
        'training_date, related_ledger_id, actor_id, actor_name, balance_after, created, updated) ' +
        'VALUES ({:id}, {:user}, 0, \'debt_settle\', false, false, {:tid}, {:ttype}, ' +
        '{:tdate}, {:related}, {:actorId}, {:actorName}, {:bal}, {:created}, {:updated})',
      {
        id: id,
        user: p.userId,
        tid: p.trainingId || '',
        ttype: p.trainingType || '',
        tdate: tdate,
        related: p.relatedLedgerId || '',
        actorId: actorId,
        actorName: name,
        bal: p.balanceAfter || 0,
        created: nowIso,
        updated: nowIso
      },
      'insert_settle'
    );
    return id;
  } catch (fullErr) {
    console.log('[membership-settle-debt] insert full failed: ' + fullErr);
    // Fallback без новых колонок
    sqlExec(
      'INSERT INTO membership_ledger ' +
        '(id, user, delta, kind, unpaid, training_id, training_date, actor_id, actor_name, ' +
        'balance_after, created, updated) ' +
        'VALUES ({:id}, {:user}, 0, \'debt_settle\', false, {:tid}, {:tdate}, ' +
        '{:actorId}, {:actorName}, {:bal}, {:created}, {:updated})',
      {
        id: id,
        user: p.userId,
        tid: p.trainingId || '',
        tdate: tdate,
        actorId: actorId,
        actorName: name,
        bal: p.balanceAfter || 0,
        created: nowIso,
        updated: nowIso
      },
      'insert_settle_fallback'
    );
    return id;
  }
}

routerAdd('POST', '/api/membership-ledger-settle-debt', (c) => {
  console.log('[membership-settle-debt] hit');
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) return apiError(c, 401, 'Unauthorized');

    var isMod = false;
    try {
      isMod = auth.getString('role') === 'moderator';
    } catch (roleErr) {
      return apiError(c, 400, 'role read: ' + errMessage(roleErr));
    }
    if (!isMod) return apiError(c, 403, 'Forbidden');

    var body = info.body || {};
    var ledgerId = String(body.ledgerId || '');
    var paid = body.paid === true || body.paid === 'true';
    var bodyUserId = body.userId ? String(body.userId) : '';

    console.log(
      '[membership-settle-debt] paid=' + paid + ' ledger=' + ledgerId + ' auth=' + auth.id
    );

    if (!ledgerId) return apiError(c, 400, 'Missing ledgerId');

    var entry = loadLedgerRow(ledgerId);
    if (!entry || !entry.id) {
      return apiError(c, 404, 'Запись истории не найдена');
    }

    var entryUserId = String(entry.user || '');
    if (!entryUserId) return apiError(c, 400, 'Некорректная запись ledger');
    if (bodyUserId && bodyUserId !== entryUserId) {
      return apiError(c, 400, 'userId не совпадает с владельцем записи');
    }

    var kind = String(entry.kind || '');
    if (!BOOKING_KINDS[kind]) {
      return apiError(c, 400, 'Списание долга доступно только для записей на тренировку');
    }

    var sessions = loadUnpaidSessions(entryUserId);
    var unpaidSessions = sessions.unpaid;
    var balanceAfter = sessions.available;
    var entryUnpaid = !!entry.unpaid;

    if (paid) {
      if (!entryUnpaid) return apiError(c, 400, 'Долг уже списан');

      sqlExec(
        'UPDATE membership_ledger SET unpaid = false, updated = CURRENT_TIMESTAMP WHERE id = {:id}',
        { id: ledgerId },
        'clear_unpaid'
      );

      var nextUnpaid = Math.max(0, unpaidSessions - 1);
      sqlExec(
        'UPDATE users SET unpaid_sessions = {:n} WHERE id = {:id}',
        { n: nextUnpaid, id: entryUserId },
        'dec_unpaid_sessions'
      );

      insertDebtSettle({
        userId: entryUserId,
        trainingId: entry.training_id || '',
        trainingType: entry.training_type || '',
        trainingDate: entry.training_date || '',
        relatedLedgerId: ledgerId,
        actorId: String(auth.id || ''),
        actorName: actorName(auth),
        balanceAfter: balanceAfter
      });

      unpaidSessions = nextUnpaid;
    } else {
      if (entryUnpaid) return apiError(c, 400, 'Долг ещё не списан');

      var settleIds = findSettleIds(ledgerId);
      if (!settleIds.length) {
        // fallback: debt_settle без related_ledger_id (старый insert) — ищем по kind+user+recent
        return apiError(c, 400, 'Нет связанного списания долга');
      }

      sqlExec(
        'UPDATE membership_ledger SET unpaid = true, updated = CURRENT_TIMESTAMP WHERE id = {:id}',
        { id: ledgerId },
        'set_unpaid'
      );

      unpaidSessions = unpaidSessions + 1;
      sqlExec(
        'UPDATE users SET unpaid_sessions = {:n} WHERE id = {:id}',
        { n: unpaidSessions, id: entryUserId },
        'inc_unpaid_sessions'
      );

      var i;
      for (i = 0; i < settleIds.length; i++) {
        try {
          sqlExec(
            'DELETE FROM membership_ledger WHERE id = {:id}',
            { id: settleIds[i] },
            'delete_settle'
          );
        } catch (delErr) {
          console.log('[membership-settle-debt] delete settle: ' + delErr);
        }
      }
    }

    console.log('[membership-settle-debt] ok unpaid_sessions=' + unpaidSessions);
    return c.json(200, {
      ok: true,
      ledgerId: ledgerId,
      paid: paid,
      unpaid_sessions: unpaidSessions
    });
  } catch (err) {
    var message = errMessage(err);
    console.log('[membership-settle-debt] catch: ' + message);
    return apiError(c, 400, message);
  }
});
