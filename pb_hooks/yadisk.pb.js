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
    var path = body.path || '';
    var result = path
      ? yadisk.resolvePublicResource(url, path)
      : yadisk.resolvePublicResource(url);
    if (result.error) {
      return c.json(result.status || 400, { error: result.error });
    }
    return c.json(200, result.item);
  } catch (err) {
    console.log('[yadisk] preview: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

// Прокси байтов (img/video): прямые URL downloader в браузере не открываются.
routerAdd('GET', '/api/yadisk-content', (c) => {
  var reader = null;
  try {
    var yadisk = require(__hooks + '/yadisklib.js');
    var info = c.requestInfo();
    if (!info.auth) {
      return c.json(401, { error: 'Unauthorized' });
    }

    var query = info.query || {};
    var kind = query.kind === 'file' ? 'file' : 'preview';
    var path = query.path || '';
    var result = yadisk.fetchContentFile(query.url || '', kind, path);
    if (result.error) {
      return c.json(result.status || 400, { error: result.error });
    }

    reader = result.file.reader.open();
    c.response.header().set('Cache-Control', 'private, max-age=600');
    if (result.file.size > 0) {
      c.response.header().set('Content-Length', String(result.file.size));
    }
    if (result.name) {
      c.response.header().set(
        'Content-Disposition',
        'inline; filename="' + String(result.name).replace(/"/g, '') + '"'
      );
    }
    // stream читает синхронно до возврата
    return c.stream(200, result.contentType || 'application/octet-stream', reader);
  } catch (err) {
    console.log('[yadisk] content: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  } finally {
    if (reader) {
      try {
        reader.close();
      } catch (closeErr) {
        // ignore
      }
    }
  }
});
