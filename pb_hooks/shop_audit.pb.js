// Серверный аудит «Магазин»: products + POST /api/audit-buy-click (коллекция audit_events).
// PB-хуки: helper вне callback недоступен — логика inline в каждом обработчике.

onRecordCreateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var title = record.getString('title') || '';
    var objectLabel = title ? 'Товар "' + title + '"' : '#' + record.id;
    var name = subject && subject.label
      ? (subject.label.indexOf(' (') > -1 ? subject.label.slice(0, subject.label.indexOf(' (')) : subject.label)
      : 'Пользователь';

    audit.logEvent($app, {
      category: 'shop',
      action: 'shop.product.create',
      actionKind: 'create',
      subject: subject,
      objectType: 'product',
      objectId: record.id,
      objectLabel: objectLabel,
      details: { article: record.id, title: title, price: record.getFloat('price') },
      summaryRu: name + ' создал(а) ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[shop-audit] products create: ' + err);
  }
}, 'products');

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var title = record.getString('title') || original.getString('title') || '';
    var objectLabel = title ? 'Товар "' + title + '"' : '#' + record.id;
    var name = 'Пользователь';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }

    var wasDeleted = original.getBool('is_deleted');
    var isDeleted = record.getBool('is_deleted');

    if (!wasDeleted && isDeleted) {
      audit.logEvent($app, {
        category: 'shop',
        action: 'shop.product.delete',
        actionKind: 'delete',
        subject: subject,
        objectType: 'product',
        objectId: record.id,
        objectLabel: objectLabel,
        details: { article: record.id },
        summaryRu: name + ' скрыл(а) ' + objectLabel,
        severity: 'info'
      });
      return;
    }

    if (wasDeleted && !isDeleted) {
      audit.logEvent($app, {
        category: 'shop',
        action: 'shop.product.restore',
        actionKind: 'restore',
        subject: subject,
        objectType: 'product',
        objectId: record.id,
        objectLabel: objectLabel,
        details: { article: record.id },
        summaryRu: name + ' восстановил(а) ' + objectLabel,
        severity: 'info'
      });
      return;
    }

    var diff = audit.diffFields(original, record, [
      'title', 'price', 'old_price', 'description', 'sizes', 'colors', 'variant_mode',
      'parameters', 'categories', 'out_of_stock', 'images'
    ]);
    if (diff.length) {
      audit.logEvent($app, {
        category: 'shop',
        action: 'shop.product.update',
        actionKind: 'update',
        subject: subject,
        objectType: 'product',
        objectId: record.id,
        objectLabel: objectLabel,
        diff: diff,
        details: { article: record.id },
        summaryRu: name + ' отредактировал(а) ' + objectLabel,
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('[shop-audit] products update: ' + err);
  }
}, 'products');

onRecordDeleteRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var record = e.record;
    var title = record.getString('title') || '';
    var objectLabel = title ? 'Товар "' + title + '"' : '#' + record.id;
    var name = 'Пользователь';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }

    audit.logEvent($app, {
      category: 'shop',
      action: 'shop.product.delete',
      actionKind: 'delete',
      subject: subject,
      objectType: 'product',
      objectId: record.id,
      objectLabel: objectLabel,
      details: { article: record.id },
      summaryRu: name + ' окончательно удалил(а) ' + objectLabel,
      severity: 'info'
    });
  } catch (err) {
    console.log('[shop-audit] products delete: ' + err);
  }
}, 'products');

routerAdd('POST', '/api/audit-buy-click', (c) => {
  try {
    var audit = require(__hooks + '/auditlib.js');
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) {
      return c.json(401, { error: 'Unauthorized' });
    }

    var body = info.body || {};
    var productIds = body.productIds;
    if (!productIds || !productIds.length) {
      return c.json(400, { error: 'productIds required' });
    }

    var subject = audit.actorInfo(auth);
    if (subject) subject.source = 'self';
    var name = 'Пользователь';
    if (subject && subject.label) {
      name = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }

    var i;
    for (i = 0; i < productIds.length; i++) {
      var productId = String(productIds[i] || '');
      if (!productId) continue;

      var title = '';
      try {
        var product = $app.findRecordById('products', productId);
        title = product.getString('title') || '';
      } catch (_) {}
      var objectLabel = title ? 'Товар "' + title + '"' : '#' + productId;

      audit.logEvent($app, {
        category: 'shop',
        action: 'shop.product.buy_click',
        actionKind: 'other',
        subject: subject,
        objectType: 'product',
        objectId: productId,
        objectLabel: objectLabel,
        details: { article: productId },
        summaryRu: name + ' нажал(а) «Купить» для ' + objectLabel,
        severity: 'info'
      });
    }

    return c.json(200, { ok: true });
  } catch (err) {
    console.log('[shop-audit] buy-click: ' + err);
    return c.json(500, { error: 'Internal error' });
  }
});
