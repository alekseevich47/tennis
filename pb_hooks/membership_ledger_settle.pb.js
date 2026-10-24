// Списание долга (mod only). Только SQL.
// DynamicModel: не читать date-поля напрямую — CAST AS TEXT в отдельном запросе.
// Не использовать findRecordById(users) / Record.get(relation).

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

function sqlExecOrThrow(sql, bind, label) {
  console.log('[membership-settle-debt] sql ' + label);
  try {
    $app.db().newQuery(sql).bind(bind || {}).execute();
    console.log('[membership-settle-debt] sql ' + label + ' ok');
  } catch (err) {
    console.log('[membership-settle-debt] sql ' + label + ' err: ' + errMessage(err));
    throw new Error('SQL ' + label + ': ' + errMessage(err));
  }
}

function newId() {
  try {
    return $security.randomStringWithAlphabet(15, 'abcdefghijklmnopqrstuvwxyz0123456789');
  } catch (_) {
    return ('s' + String(Date.now()) + 'abcdefghij').slice(0, 15);
  }
}

/** training_id / training_date только как TEXT — иначе goja зависает на date. */
function loadTrainingSnapshot(ledgerId) {
  var out = { trainingId: '', trainingDate: '' };
  try {
    var row = new DynamicModel({ tid: '', tdate: '' });
    $app.db().newQuery(
      'SELECT COALESCE(training_id, \'\') AS tid, ' +
        'COALESCE(CAST(training_date AS TEXT), \'\') AS tdate ' +
        'FROM membership_ledger WHERE id = {:id}'
    ).bind({ id: String(ledgerId) }).one(row);
    out.trainingId = String(row.tid || '');
    out.trainingDate = String(row.tdate || '');
  } catch (err) {
    console.log('[membership-settle-debt] training snapshot err: ' + errMessage(err));
  }
  return out;
}

routerAdd('POST', '/api/membership-ledger-settle-debt', (c) => {
  console.log('[membership-settle-debt] hit v7');
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
    var authId = '';
    try {
      authId = String(auth.id || '');
    } catch (_) {}

    console.log(
      '[membership-settle-debt] paid=' + paid + ' ledger=' + ledgerId + ' auth=' + authId
    );

    if (!ledgerId) return apiError(c, 400, 'Missing ledgerId');
    if (!bodyUserId) return apiError(c, 400, 'Missing userId');

    // Только скаляры без date — kind/unpaid/id
    var entry = new DynamicModel({
      id: '',
      kind: '',
      unpaid: false
    });
    try {
      $app.db().newQuery(
        'SELECT id, kind, unpaid FROM membership_ledger ' +
          'WHERE id = {:id} AND "user" = {:uid}'
      ).bind({ id: ledgerId, uid: bodyUserId }).one(entry);
    } catch (err) {
      console.log('[membership-settle-debt] ledger query err: ' + errMessage(err));
      return apiError(c, 404, 'Запись истории не найдена');
    }

    var kind = String(entry.kind || '');
    var entryUnpaid = !!entry.unpaid;
    console.log(
      '[membership-settle-debt] ledger ok kind=' + kind + ' unpaid=' + entryUnpaid
    );

    if (!BOOKING_KINDS[kind]) {
      return apiError(c, 400, 'Списание долга доступно только для записей на тренировку');
    }

    var snap = loadTrainingSnapshot(ledgerId);
    var trainingId = snap.trainingId;
    var trainingDate = snap.trainingDate;
    console.log('[membership-settle-debt] training tid=' + trainingId);

    var entryUserId = bodyUserId;

    var sessions = new DynamicModel({
      unpaid_sessions: 0,
      available_sessions: 0
    });
    try {
      $app.db().newQuery(
        'SELECT unpaid_sessions, available_sessions FROM users WHERE id = {:id}'
      ).bind({ id: entryUserId }).one(sessions);
    } catch (err) {
      console.log('[membership-settle-debt] user query err: ' + errMessage(err));
      return apiError(c, 404, 'Пользователь не найден');
    }
    console.log('[membership-settle-debt] user ok');

    var unpaidSessions = Math.max(0, Math.floor(Number(sessions.unpaid_sessions) || 0));
    var balanceAfter = Math.max(0, Number(sessions.available_sessions) || 0);

    var actorName = 'Модератор';
    try {
      var n = auth.getString('full_name') || '';
      if (n) actorName = n;
    } catch (_) {}

    if (paid) {
      if (!entryUnpaid) return apiError(c, 400, 'Долг уже списан');

      sqlExecOrThrow(
        'UPDATE membership_ledger SET unpaid = false WHERE id = {:id}',
        { id: ledgerId },
        'clear_unpaid'
      );

      unpaidSessions = Math.max(0, unpaidSessions - 1);
      sqlExecOrThrow(
        'UPDATE users SET unpaid_sessions = {:n} WHERE id = {:id}',
        { n: unpaidSessions, id: entryUserId },
        'dec_unpaid'
      );

      var settleId = newId();
      var nowIso = new Date().toISOString();
      // training_date: пустая строка безопаснее, чем сырой date из DynamicModel
      sqlExecOrThrow(
        'INSERT INTO membership_ledger (' +
          'id, "user", delta, kind, unpaid, training_id, training_date, ' +
          'actor_id, actor_name, balance_after, created, updated' +
          ') VALUES (' +
          '{:id}, {:uid}, 0, {:kind}, false, {:tid}, {:tdate}, ' +
          '{:actorId}, {:actorName}, {:bal}, {:created}, {:updated}' +
          ')',
        {
          id: settleId,
          uid: entryUserId,
          kind: 'debt_settle',
          tid: trainingId,
          tdate: trainingDate || '',
          actorId: authId,
          actorName: actorName,
          bal: balanceAfter,
          created: nowIso,
          updated: nowIso
        },
        'insert_settle'
      );
    } else {
      if (entryUnpaid) return apiError(c, 400, 'Долг ещё не списан');

      var settleRow = new DynamicModel({ id: '' });
      try {
        $app.db().newQuery(
          'SELECT id FROM membership_ledger WHERE kind = {:kind} AND "user" = {:uid} ' +
            'AND training_id = {:tid} ORDER BY created DESC LIMIT 1'
        ).bind({
          kind: 'debt_settle',
          uid: entryUserId,
          tid: trainingId
        }).one(settleRow);
      } catch (err) {
        console.log('[membership-settle-debt] find settle err: ' + errMessage(err));
        return apiError(c, 400, 'Нет связанного списания долга');
      }
      if (!settleRow.id) return apiError(c, 400, 'Нет связанного списания долга');

      sqlExecOrThrow(
        'UPDATE membership_ledger SET unpaid = true WHERE id = {:id}',
        { id: ledgerId },
        'set_unpaid'
      );

      unpaidSessions = unpaidSessions + 1;
      sqlExecOrThrow(
        'UPDATE users SET unpaid_sessions = {:n} WHERE id = {:id}',
        { n: unpaidSessions, id: entryUserId },
        'inc_unpaid'
      );

      sqlExecOrThrow(
        'DELETE FROM membership_ledger WHERE id = {:id}',
        { id: String(settleRow.id) },
        'delete_settle'
      );
    }

    console.log('[membership-settle-debt] ok unpaid_sessions=' + unpaidSessions);
    return c.json(200, {
      ok: true,
      ledgerId: ledgerId,
      paid: paid,
      unpaid_sessions: unpaidSessions
    });
  } catch (err) {
    console.log('[membership-settle-debt] catch: ' + errMessage(err));
    return apiError(c, 400, errMessage(err));
  }
});
