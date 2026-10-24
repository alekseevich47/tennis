// Списание долга (mod only). Только SQL по известным колонкам —
// SELECT/INSERT с отсутствующими полями → BadRequestError обходит goja catch.

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
  console.log('[membership-settle-debt] sql ' + (label || 'exec'));
  try {
    $app.db().newQuery(sql).bind(bind || {}).execute();
    console.log('[membership-settle-debt] sql ' + (label || 'exec') + ' ok');
    return true;
  } catch (err) {
    console.log('[membership-settle-debt] sql ' + (label || 'exec') + ' err: ' + errMessage(err));
    return false;
  }
}

function sqlExecOrFail(sql, bind, label) {
  if (!sqlExec(sql, bind, label)) {
    throw new Error('SQL ' + (label || 'exec') + ' failed');
  }
}

/** Кеш наличия колонок membership_ledger (pragma — без BadRequest). */
var _ledgerCols = null;

function refreshLedgerColumns() {
  if (_ledgerCols) return _ledgerCols;
  var map = {};
  try {
    var result = arrayOf(new DynamicModel({ name: '' }));
    $app.db().newQuery('PRAGMA table_info(membership_ledger)').all(result);
    var i;
    for (i = 0; i < result.length; i++) {
      var n = '';
      try {
        n = String(result[i].name || '');
      } catch (_) {}
      if (n) map[n] = true;
    }
  } catch (err) {
    console.log('[membership-settle-debt] pragma: ' + errMessage(err));
  }
  _ledgerCols = map;
  console.log(
    '[membership-settle-debt] cols related=' +
      !!map.related_ledger_id +
      ' type=' +
      !!map.training_type +
      ' within=' +
      !!map.within_daily_limit
  );
  return map;
}

function loadLedgerRow(ledgerId) {
  console.log('[membership-settle-debt] load ledger ' + ledgerId);
  var row = new DynamicModel({
    id: '',
    user: '',
    kind: '',
    unpaid: false,
    training_id: '',
    training_date: '',
    delta: 0
  });
  try {
    $app.db().newQuery(
      'SELECT id, "user" AS user, kind, unpaid, training_id, training_date, delta ' +
        'FROM membership_ledger WHERE id = {:id}'
    ).bind({ id: String(ledgerId) }).one(row);
  } catch (err) {
    console.log('[membership-settle-debt] load ledger err: ' + errMessage(err));
    return null;
  }
  row.training_type = '';
  var cols = refreshLedgerColumns();
  if (cols.training_type) {
    try {
      var trow = new DynamicModel({ training_type: '' });
      $app.db().newQuery(
        'SELECT training_type FROM membership_ledger WHERE id = {:id}'
      ).bind({ id: String(ledgerId) }).one(trow);
      row.training_type = trow.training_type || '';
    } catch (_) {}
  }
  console.log(
    '[membership-settle-debt] load ledger ok kind=' +
      row.kind +
      ' unpaid=' +
      row.unpaid +
      ' user=' +
      row.user
  );
  return row;
}

function loadUnpaidSessions(userId) {
  console.log('[membership-settle-debt] load user ' + userId);
  var row = new DynamicModel({ unpaid_sessions: 0, available_sessions: 0 });
  try {
    $app.db().newQuery(
      'SELECT unpaid_sessions, available_sessions FROM users WHERE id = {:id}'
    ).bind({ id: String(userId) }).one(row);
  } catch (err) {
    console.log('[membership-settle-debt] load user err: ' + errMessage(err));
    throw new Error('Пользователь не найден');
  }
  console.log('[membership-settle-debt] load user ok unpaid=' + row.unpaid_sessions);
  return {
    unpaid: Math.max(0, Math.floor(Number(row.unpaid_sessions) || 0)),
    available: Math.max(0, Number(row.available_sessions) || 0)
  };
}

function findSettleIds(relatedId, userId, trainingId) {
  var ids = [];
  var cols = refreshLedgerColumns();
  if (cols.related_ledger_id) {
    try {
      var srow = new DynamicModel({ id: '' });
      var result = arrayOf(new DynamicModel({ id: '' }));
      $app.db().newQuery(
        'SELECT id FROM membership_ledger WHERE kind = {:kind} AND related_ledger_id = {:rid}'
      ).bind({ kind: 'debt_settle', rid: String(relatedId) }).all(result);
      var i;
      for (i = 0; i < result.length; i++) {
        if (result[i].id) ids.push(String(result[i].id));
      }
    } catch (err) {
      console.log('[membership-settle-debt] find settle by related: ' + errMessage(err));
    }
  }
  if (!ids.length && userId && trainingId) {
    try {
      var result2 = arrayOf(new DynamicModel({ id: '' }));
      $app.db().newQuery(
        'SELECT id FROM membership_ledger WHERE kind = {:kind} AND "user" = {:uid} ' +
          'AND training_id = {:tid} ORDER BY created DESC LIMIT 5'
      ).bind({ kind: 'debt_settle', uid: String(userId), tid: String(trainingId) }).all(result2);
      var j;
      for (j = 0; j < result2.length; j++) {
        if (result2[j].id) ids.push(String(result2[j].id));
      }
    } catch (err2) {
      console.log('[membership-settle-debt] find settle by training: ' + errMessage(err2));
    }
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

function newLedgerId() {
  try {
    return $security.randomStringWithAlphabet(15, 'abcdefghijklmnopqrstuvwxyz0123456789');
  } catch (_) {
    return ('x' + String(Date.now()) + 'abcdefgh').slice(0, 15);
  }
}

function insertDebtSettle(p) {
  var id = newLedgerId();
  var nowIso = new Date().toISOString();
  var cols = refreshLedgerColumns();
  var tdate = p.trainingDate ? String(p.trainingDate) : '';

  if (cols.related_ledger_id && cols.training_type && cols.within_daily_limit) {
    var okFull = sqlExec(
      'INSERT INTO membership_ledger ' +
        '(id, "user", delta, kind, unpaid, within_daily_limit, training_id, training_type, ' +
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
        actorId: p.actorId || '',
        actorName: p.actorName || '',
        bal: p.balanceAfter || 0,
        created: nowIso,
        updated: nowIso
      },
      'insert_settle_full'
    );
    if (okFull) return id;
  }

  sqlExecOrFail(
    'INSERT INTO membership_ledger ' +
      '(id, "user", delta, kind, unpaid, training_id, training_date, actor_id, actor_name, ' +
      'balance_after, created, updated) ' +
      'VALUES ({:id}, {:user}, 0, \'debt_settle\', false, {:tid}, {:tdate}, ' +
      '{:actorId}, {:actorName}, {:bal}, {:created}, {:updated})',
    {
      id: id,
      user: p.userId,
      tid: p.trainingId || '',
      tdate: tdate,
      actorId: p.actorId || '',
      actorName: p.actorName || '',
      bal: p.balanceAfter || 0,
      created: nowIso,
      updated: nowIso
    },
    'insert_settle_base'
  );

  // best-effort: проставить related, если колонка появилась
  if (cols.related_ledger_id && p.relatedLedgerId) {
    sqlExec(
      'UPDATE membership_ledger SET related_ledger_id = {:r} WHERE id = {:id}',
      { r: p.relatedLedgerId, id: id },
      'set_related'
    );
  }
  if (cols.training_type && p.trainingType) {
    sqlExec(
      'UPDATE membership_ledger SET training_type = {:t} WHERE id = {:id}',
      { t: p.trainingType, id: id },
      'set_training_type'
    );
  }
  return id;
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

      sqlExecOrFail(
        'UPDATE membership_ledger SET unpaid = false, updated = {:u} WHERE id = {:id}',
        { u: new Date().toISOString(), id: ledgerId },
        'clear_unpaid'
      );

      var nextUnpaid = Math.max(0, unpaidSessions - 1);
      sqlExecOrFail(
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

      var settleIds = findSettleIds(ledgerId, entryUserId, entry.training_id || '');
      if (!settleIds.length) {
        return apiError(c, 400, 'Нет связанного списания долга');
      }

      sqlExecOrFail(
        'UPDATE membership_ledger SET unpaid = true, updated = {:u} WHERE id = {:id}',
        { u: new Date().toISOString(), id: ledgerId },
        'set_unpaid'
      );

      unpaidSessions = unpaidSessions + 1;
      sqlExecOrFail(
        'UPDATE users SET unpaid_sessions = {:n} WHERE id = {:id}',
        { n: unpaidSessions, id: entryUserId },
        'inc_unpaid_sessions'
      );

      var i;
      for (i = 0; i < settleIds.length; i++) {
        sqlExec(
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
    var message = errMessage(err);
    console.log('[membership-settle-debt] catch: ' + message);
    return apiError(c, 400, message);
  }
});
