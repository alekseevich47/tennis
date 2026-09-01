// Poster для видео: ffmpeg после upload + GET /api/video-poster

var poster = require(__hooks + '/video_poster_lib.js');

for (var t = 0; t < poster.MEDIA_TARGETS.length; t++) {
  (function (target) {
    onRecordAfterCreateSuccess(function (e) {
      try {
        poster.processRecordVideos(e.record, target.fields);
      } catch (err) {
        console.log('[video-poster] create ' + target.collection + ': ' + err);
      }
    }, target.collection);

    onRecordAfterUpdateSuccess(function (e) {
      try {
        poster.processRecordVideosOnUpdate(e.record, e.record.original(), target.fields);
      } catch (err) {
        console.log('[video-poster] update ' + target.collection + ': ' + err);
      }
    }, target.collection);
  })(poster.MEDIA_TARGETS[t]);
}

routerAdd('GET', '/api/video-poster', (c) => {
  try {
    var query = c.requestInfo().query || {};
    var collection = query.collection || '';
    var recordId = query.record || query.recordId || '';
    var filename = query.file || query.filename || '';
    var thumbSize = poster.parseThumbSize(query.thumb || '');

    if (!collection || !recordId || !filename) {
      return c.json(400, { error: 'missing_params' });
    }

    if (!poster.getMediaTarget(collection)) {
      return c.json(404, { error: 'not_found' });
    }

    var record;
    try {
      record = $app.findRecordById(collection, recordId);
    } catch (_) {
      return c.json(404, { error: 'not_found' });
    }

    var resolved = poster.resolvePosterFile(record, filename, thumbSize);
    if (resolved.error) {
      return c.json(resolved.status || 400, { error: resolved.error });
    }

    var bytes = $os.readFile(resolved.path);
    c.response.header().set('Content-Type', resolved.contentType || 'image/jpeg');
    c.response.header().set('Cache-Control', 'public, max-age=86400, immutable');
    return c.blob(200, bytes);
  } catch (err) {
    console.log('[video-poster] route: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});
