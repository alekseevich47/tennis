// Списание долга по строке membership_ledger (только moderator).
// Всё внутри хендлера + require(lib): top-level из .pb.js хендлеру недоступны.
// Мутации — SQL ($app.db()), без findRecordById(users) (зависает на стенде).
// Безопасность: auth + role=moderator; ledger.user == body.userId; kind ∈ booking-семейство;
// состояние unpaid обязано соответствовать действию; всё в одной транзакции.

routerAdd('POST', '/api/membership-ledger-settle-debt', (c) => {
  var api = require(__hooks + '/membershipapilib.js');
  console.log('[membership-settle-debt] hit v9');
  try {
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) return api.apiError(c, 401, 'Unauthorized');

    var isMod = false;
    try {
      isMod = auth.getString('role') === 'moderator';
    } catch (roleErr) {
      return api.apiError(c, 400, 'role read: ' + api.errMessage(roleErr));
    }
    if (!isMod) return api.apiError(c, 403, 'Forbidden');

    var body = info.body || {};
    var ledgerId = String(body.ledgerId || '');
    var userId = String(body.userId || '');
    var paid = body.paid === true || body.paid === 'true';
    var authId = String(auth.id || '');
    if (!ledgerId) return api.apiError(c, 400, 'Missing ledgerId');
    if (!userId) return api.apiError(c, 400, 'Missing userId');
    console.log('[membership-settle-debt] paid=' + paid + ' ledger=' + ledgerId + ' by=' + authId);

    var entry = new DynamicModel({ id: '', kind: '', unpaid: false, tid: '' });
    try {
      $app.db().newQuery(
        'SELECT id, kind, unpaid, COALESCE(training_id, \'\') AS tid ' +
          'FROM membership_ledger WHERE id = {:id} AND "user" = {:uid}'
      ).bind({ id: ledgerId, uid: userId }).one(entry);
    } catch (err) {
      return api.apiError(c, 404, 'Запись истории не найдена');
    }

    var kind = String(entry.kind || '');
    if (kind !== 'booking' && kind !== 'training_restored') {
      return api.apiError(c, 400, 'Списание долга доступно только для записей на тренировку');
    }
    var entryUnpaid = !!entry.unpaid;
    var trainingId = String(entry.tid || '');

    var sessions = new DynamicModel({ unpaid_sessions: 0, available_sessions: 0 });
    try {
      $app.db().newQuery(
        'SELECT unpaid_sessions, available_sessions FROM users WHERE id = {:id}'
      ).bind({ id: userId }).one(sessions);
    } catch (err) {
      return api.apiError(c, 404, 'Пользователь не найден');
    }
    var unpaidSessions = Math.max(0, Math.floor(Number(sessions.unpaid_sessions) || 0));
    var balanceAfter = Math.max(0, Number(sessions.available_sessions) || 0);

    var actorName = 'Модератор';
    try {
      actorName = auth.getString('full_name') || actorName;
    } catch (_) {}
    // Связь settle ↔ booking: related_ledger_id (если схема импортирована) + тег в actor_name.
    var actorTag = actorName + ' #' + ledgerId;

    // Формат PB-БД с пробелом: 'T' ломает сортировку по created (строки всплывали наверх).
    var nowIso = new Date().toISOString().replace('T', ' ');
    var result = { unpaid: unpaidSessions };

    if (paid) {
      if (!entryUnpaid) return api.apiError(c, 400, 'Долг уже списан');

      var settleId = '';
      try {
        settleId = $security.randomStringWithAlphabet(15, 'abcdefghijklmnopqrstuvwxyz0123456789');
      } catch (_) {
        settleId = ('s' + String(Date.now()) + 'abcdefghij').slice(0, 15);
      }

      $app.runInTransaction(function (txApp) {
        var db = txApp.db();
        db.newQuery('UPDATE membership_ledger SET unpaid = false WHERE id = {:id}')
          .bind({ id: ledgerId }).execute();
        result.unpaid = Math.max(0, unpaidSessions - 1);
        db.newQuery('UPDATE users SET unpaid_sessions = {:n} WHERE id = {:id}')
          .bind({ n: result.unpaid, id: userId }).execute();

        var params = {
          id: settleId, uid: userId, kind: 'debt_settle', tid: trainingId,
          actorId: authId, actorName: actorTag, bal: balanceAfter,
          created: nowIso, updated: nowIso, rel: ledgerId
        };
        try {
          db.newQuery(
            'INSERT INTO membership_ledger (id, "user", delta, kind, unpaid, training_id, ' +
              'related_ledger_id, actor_id, actor_name, balance_after, created, updated) VALUES (' +
              '{:id}, {:uid}, 0, {:kind}, false, {:tid}, {:rel}, {:actorId}, {:actorName}, ' +
              '{:bal}, {:created}, {:updated})'
          ).bind(params).execute();
        } catch (noColErr) {
          // schema ещё не импортирована (нет related_ledger_id) — базовые колонки
          db.newQuery(
            'INSERT INTO membership_ledger (id, "user", delta, kind, unpaid, training_id, ' +
              'actor_id, actor_name, balance_after, created, updated) VALUES (' +
              '{:id}, {:uid}, 0, {:kind}, false, {:tid}, {:actorId}, {:actorName}, ' +
              '{:bal}, {:created}, {:updated})'
          ).bind(params).execute();
        }
      });

      // Оплаченная бронь: синхронизируем training.unpaid_booked_users (используется
      // при unbook/cancel/freeze/stop для решения — вернуть сессию или только снять долг).
      // Вне SQL-транзакции выше: это отдельная Record-мутация ($app.save), а не txApp.
      try {
        require(__hooks + '/trainingslib.js').setTrainingUnpaidFlag(
          $app,
          trainingId,
          userId,
          false
        );
      } catch (syncErr) {
        console.log('[membership-settle-debt] training unpaid sync: ' + syncErr);
      }
    } else {
      if (entryUnpaid) return api.apiError(c, 400, 'Долг ещё не списан');

      var settle = new DynamicModel({ id: '' });
      var found = false;
      try {
        $app.db().newQuery(
          'SELECT id FROM membership_ledger WHERE kind = \'debt_settle\' AND "user" = {:uid} ' +
            'AND related_ledger_id = {:rel} ORDER BY created DESC LIMIT 1'
        ).bind({ uid: userId, rel: ledgerId }).one(settle);
        found = !!settle.id;
      } catch (_) {}
      if (!found) {
        try {
          $app.db().newQuery(
            'SELECT id FROM membership_ledger WHERE kind = \'debt_settle\' AND "user" = {:uid} ' +
              'AND actor_name LIKE {:tag} ORDER BY created DESC LIMIT 1'
          ).bind({ uid: userId, tag: '%#' + ledgerId }).one(settle);
          found = !!settle.id;
        } catch (_) {}
      }
      if (!found) return api.apiError(c, 400, 'Нет связанного списания долга');

      $app.runInTransaction(function (txApp) {
        var db = txApp.db();
        db.newQuery('UPDATE membership_ledger SET unpaid = true WHERE id = {:id}')
          .bind({ id: ledgerId }).execute();
        result.unpaid = unpaidSessions + 1;
        db.newQuery('UPDATE users SET unpaid_sessions = {:n} WHERE id = {:id}')
          .bind({ n: result.unpaid, id: userId }).execute();
        db.newQuery('DELETE FROM membership_ledger WHERE id = {:id}')
          .bind({ id: String(settle.id) }).execute();
      });

      try {
        require(__hooks + '/trainingslib.js').setTrainingUnpaidFlag(
          $app,
          trainingId,
          userId,
          true
        );
      } catch (syncErr) {
        console.log('[membership-settle-debt] training unpaid sync: ' + syncErr);
      }
    }

    console.log('[membership-settle-debt] ok unpaid_sessions=' + result.unpaid);
    return c.json(200, {
      ok: true,
      ledgerId: ledgerId,
      paid: paid,
      unpaid_sessions: result.unpaid
    });
  } catch (err) {
    var message = api.errMessage(err);
    console.log('[membership-settle-debt] catch: ' + message);
    return api.apiError(c, 400, message);
  }
});
