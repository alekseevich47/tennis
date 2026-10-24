// История списаний/пополнений посещений абонемента (коллекция membership_ledger).
// Файл без .pb.js — require() внутри хендлеров/cron. Запись только сервером ($app.save / txApp).

function actorFullName(actor) {
  if (!actor) return '';
  var name = '';
  try { name = actor.getString('full_name') || ''; } catch (_) {}
  if (!name) {
    try {
      if (actor.collection && actor.collection().name === '_superusers') name = 'Администратор';
    } catch (_) {}
  }
  return name;
}

/**
 * @param {core.App} app
 * @param {{
 *   userId: string,
 *   delta: number,
 *   kind: string,
 *   unpaid?: boolean,
 *   withinDailyLimit?: boolean,
 *   trainingId?: string,
 *   trainingType?: string,
 *   trainingDate?: string,
 *   relatedLedgerId?: string,
 *   actor?: any,
 *   balanceAfter?: number
 * }} p
 * @returns {any|null} созданная запись или null
 */
function logMovement(app, p) {
  if (!p || !p.userId || !p.kind) return null;
  var delta = Number(p.delta) || 0;
  var withinDailyLimit = !!p.withinDailyLimit;
  var kind = String(p.kind);
  if (delta === 0 && !p.unpaid && !withinDailyLimit && kind !== 'debt_settle') return null;
  try {
    var collection = app.findCollectionByNameOrId('membership_ledger');
    var record = new Record(collection);
    record.set('user', String(p.userId));
    record.set('delta', delta);
    record.set('kind', kind);
    record.set('unpaid', !!p.unpaid);
    record.set('within_daily_limit', withinDailyLimit);
    if (p.trainingId) record.set('training_id', String(p.trainingId));
    if (p.trainingType) record.set('training_type', String(p.trainingType));
    if (p.trainingDate) record.set('training_date', p.trainingDate);
    if (p.relatedLedgerId) record.set('related_ledger_id', String(p.relatedLedgerId));
    if (p.actor && p.actor.id) {
      record.set('actor_id', String(p.actor.id));
      record.set('actor_name', actorFullName(p.actor));
    }
    if (p.balanceAfter != null) record.set('balance_after', Number(p.balanceAfter) || 0);
    app.save(record);
    return record;
  } catch (err) {
    console.log('[membership_ledger] ' + err);
    return null;
  }
}

module.exports = {
  logMovement: logMovement,
  actorFullName: actorFullName
};
