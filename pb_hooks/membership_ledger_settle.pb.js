// Списание долга (mod only).
// users — только SQL (findRecordById(users) в routerAdd на стенде зависает).
// ledger — findRecordById + SQL UPDATE/INSERT базовых колонок (без training_type/related_*).

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

function loadUserSessions(userId) {
  console.log('[membership-settle-debt] sql load user ' + userId);
  var row = new DynamicModel({
    unpaid_sessions: 0,
    available_sessions: 0
  });
  try {
    $app.db().newQuery(
      'SELECT unpaid_sessions, available_sessions FROM users WHERE id = {:id}'
    ).bind({ id: String(userId) }).one(row);
  } catch (err) {
    console.log('[membership-settle-debt] sql load user err: ' + errMessage(err));
    throw new Error('Пользователь не найден');
  }
  console.log('[membership-settle-debt] sql load user ok');
  return {
    unpaid: Math.max(0, Math.floor(Number(row.unpaid_sessions) || 0)),
    available: Math.max(0, Number(row.available_sessions) || 0)
  };
}

function actorName(auth) {
  var name = '';
  try {
    name = auth.getString('full_name') || '';
  } catch (_) {}
  return name || 'Модератор';
}

function newId() {
  try {
    return $security.randomStringWithAlphabet(15, 'abcdefghijklmnopqrstuvwxyz0123456789');
  } catch (_) {
    return ('s' + String(Date.now()) + 'abcdefghij').slice(0, 15);
  }
}

function insertSettleBase(p) {
  var id = newId();
  var nowIso = new Date().toISOString();
  sqlExecOrThrow(
    'INSERT INTO membership_ledger (' +
      'id, user, delta, kind, unpaid, training_id, training_date, ' +
      'actor_id, actor_name, balance_after, created, updated' +
      ') VALUES (' +
      '{:id}, {:user}, 0, {:kind}, false, {:tid}, {:tdate}, ' +
      '{:actorId}, {:actorName}, {:bal}, {:created}, {:updated}' +
      ')',
    {
      id: id,
      user: p.userId,
      kind: 'debt_settle',
      tid: p.trainingId || '',
      tdate: p.trainingDate || '',
      actorId: p.actorId || '',
      actorName: p.actorName || '',
      bal: p.balanceAfter || 0,
      created: nowIso,
      updated: nowIso
    },
    'insert_settle'
  );
  return id;
}

function findSettleIdsByTraining(userId, trainingId) {
  var ids = [];
  if (!userId || !trainingId) return ids;
  console.log('[membership-settle-debt] find settle training=' + trainingId);
  try {
    var rows = $app.findRecordsByFilter(
      'membership_ledger',
      'kind = "debt_settle" && user = "' +
        String(userId) +
        '" && training_id = "' +
        String(trainingId) +
        '"',
      '-created',
      5,
      0
    );
    var i;
    for (i = 0; i < (rows || []).length; i++) {
      ids.push(String(rows[i].id));
    }
  } catch (err) {
    console.log('[membership-settle-debt] find settle err: ' + errMessage(err));
  }
  return ids;
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
      '[membership-settle-debt] paid=' +
        paid +
        ' ledger=' +
        ledgerId +
        ' auth=' +
        auth.id
    );

    if (!ledgerId) return apiError(c, 400, 'Missing ledgerId');

    console.log('[membership-settle-debt] step=find ledger');
    var entry;
    try {
      entry = $app.findRecordById('membership_ledger', ledgerId);
    } catch (findErr) {
      console.log('[membership-settle-debt] find ledger err: ' + errMessage(findErr));
      return apiError(c, 404, 'Запись истории не найдена');
    }
    console.log('[membership-settle-debt] step=ledger ok');

    var entryUserId = '';
    try {
      entryUserId = String(entry.getString('user') || entry.get('user') || '');
    } catch (_) {
      entryUserId = String(entry.get('user') || '');
    }
    if (!entryUserId) return apiError(c, 400, 'Некорректная запись ledger');
    if (bodyUserId && bodyUserId !== entryUserId) {
      return apiError(c, 400, 'userId не совпадает с владельцем записи');
    }

    var kind = String(entry.getString('kind') || '');
    if (!BOOKING_KINDS[kind]) {
      return apiError(c, 400, 'Списание долга доступно только для записей на тренировку');
    }

    var entryUnpaid = false;
    try {
      entryUnpaid = !!entry.getBool('unpaid');
    } catch (_) {
      entryUnpaid = !!entry.get('unpaid');
    }

    var trainingId = '';
    var trainingDate = '';
    try {
      trainingId = String(entry.getString('training_id') || '');
      trainingDate = String(entry.getString('training_date') || '');
    } catch (_) {}

    var sessions = loadUserSessions(entryUserId);
    var unpaidSessions = sessions.unpaid;
    var balanceAfter = sessions.available;

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

      insertSettleBase({
        userId: entryUserId,
        trainingId: trainingId,
        trainingDate: trainingDate,
        actorId: String(auth.id || ''),
        actorName: actorName(auth),
        balanceAfter: balanceAfter
      });
    } else {
      if (entryUnpaid) return apiError(c, 400, 'Долг ещё не списан');

      var settleIds = findSettleIdsByTraining(entryUserId, trainingId);
      if (!settleIds.length) {
        return apiError(c, 400, 'Нет связанного списания долга');
      }

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

      var i;
      for (i = 0; i < settleIds.length; i++) {
        sqlExecOrThrow(
          'DELETE FROM membership_ledger WHERE id = {:id}',
          { id: settleIds[i] },
          'delete_settle'
        );
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
    console.log('[membership-settle-debt] catch: ' + errMessage(err));
    return apiError(c, 400, errMessage(err));
  }
});
