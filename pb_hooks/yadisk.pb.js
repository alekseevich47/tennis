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

// Прокси байтов (img/video): прямые URL downloader.disk.yandex.ru в браузере часто ломаются.
routerAdd('GET', '/api/yadisk-content', (c) => {
  try {
    var yadisk = require(__hooks + '/yadisklib.js');
    var info = c.requestInfo();
    if (!info.auth) {
      return c.json(401, { error: 'Unauthorized' });
    }

    var query = info.query || {};
    var kind = query.kind === 'file' ? 'file' : 'preview';
    var result = yadisk.fetchContentBytes(query.url || '', kind);
    if (result.error) {
      return c.json(result.status || 400, { error: result.error });
    }

    c.response.header().set('Content-Type', result.contentType || 'application/octet-stream');
    c.response.header().set('Cache-Control', 'private, max-age=600');
    if (result.name) {
      c.response.header().set(
        'Content-Disposition',
        'inline; filename="' + String(result.name).replace(/"/g, '') + '"'
      );
    }
    c.response.writeHeader(200);
    c.response.write(result.body);
    return null;
  } catch (err) {
    console.log('[yadisk] content: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});
