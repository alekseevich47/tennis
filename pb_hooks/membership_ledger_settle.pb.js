// Списание долга (mod only). Только SQL. Без Record.get / findRecordById(users|ledger).
// client шлёт userId — сверяем SQL: WHERE id AND user.

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

routerAdd('POST', '/api/membership-ledger-settle-debt', (c) => {
  console.log('[membership-settle-debt] hit v6');
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
    console.log('[membership-settle-debt] after-paid');

    if (!ledgerId) return apiError(c, 400, 'Missing ledgerId');
    if (!bodyUserId) return apiError(c, 400, 'Missing userId');

    // Не SELECT user — колонка/алиас на стенде может подвешивать goja DynamicModel.
    console.log('[membership-settle-debt] before-ledger-dm');
    var entry = new DynamicModel({
      id: '',
      kind: '',
      unpaid: false,
      training_id: '',
      training_date: ''
    });
    console.log('[membership-settle-debt] after-ledger-dm');

    console.log('[membership-settle-debt] before-ledger-query');
    try {
      $app.db().newQuery(
        'SELECT id, kind, unpaid, training_id, training_date ' +
          'FROM membership_ledger WHERE id = {:id} AND "user" = {:uid}'
      ).bind({ id: ledgerId, uid: bodyUserId }).one(entry);
    } catch (err) {
      console.log('[membership-settle-debt] ledger query err: ' + errMessage(err));
      return apiError(c, 404, 'Запись истории не найдена');
    }
    console.log(
      '[membership-settle-debt] ledger ok kind=' +
        entry.kind +
        ' unpaid=' +
        entry.unpaid
    );

    var kind = String(entry.kind || '');
    if (!BOOKING_KINDS[kind]) {
      return apiError(c, 400, 'Списание долга доступно только для записей на тренировку');
    }

    var entryUnpaid = !!entry.unpaid;
    var trainingId = String(entry.training_id || '');
    var trainingDate = String(entry.training_date || '');
    var entryUserId = bodyUserId;

    console.log('[membership-settle-debt] before-user-dm');
    var sessions = new DynamicModel({
      unpaid_sessions: 0,
      available_sessions: 0
    });
    console.log('[membership-settle-debt] before-user-query');
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
          tdate: trainingDate,
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

      console.log('[membership-settle-debt] before-find-settle');
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
