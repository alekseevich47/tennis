// content_views: создание только через POST /api/content-view (statslib.createContentView).
// createRule в schema = null; хук режет прямые API-записи.

onRecordCreateRequest((e) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    if (!stats.isContentViewCreateAllowed()) {
      throw new ForbiddenError('Use POST /api/content-view');
    }
    e.next();
  } catch (err) {
    var status = err && err.status;
    if (status >= 400 && status < 600) throw err;
    console.log('[content-views-create] ' + err);
    throw new BadRequestError('content_views create: ' + (err.message || String(err)));
  }
}, 'content_views');
