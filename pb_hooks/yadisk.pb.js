// Публичные превью Яндекс.Диска для ленты.
// Логика — pb_hooks/yadisklib.js (require внутри хендлеров).

routerAdd('POST', '/api/yadisk-preview', (c) => {
  try {
    var yadisk = require(__hooks + '/yadisklib.js');
    var info = c.requestInfo();
    if (!info.auth) {
      return c.json(401, { error: 'Unauthorized' });
    }

    var body = info.body || {};
    var url = body.url || '';
    var result = yadisk.resolvePublicResource(url);
    if (result.error) {
      return c.json(result.status || 400, { error: result.error });
    }
    return c.json(200, result.item);
  } catch (err) {
    console.log('[yadisk] preview: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});
