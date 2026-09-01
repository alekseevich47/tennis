// Poster для видео: ffmpeg после upload + GET /api/video-poster
// Логика — video_poster_lib.js (require внутри хендлеров).

onRecordAfterCreateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideos(e.record, ['media']);
  } catch (err) {
    console.log('[video-poster] create posts: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'posts');

onRecordAfterUpdateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideosOnUpdate(e.record, e.record.original(), ['media']);
  } catch (err) {
    console.log('[video-poster] update posts: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'posts');

onRecordAfterCreateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideos(e.record, ['media']);
  } catch (err) {
    console.log('[video-poster] create comments: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'comments');

onRecordAfterUpdateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideosOnUpdate(e.record, e.record.original(), ['media']);
  } catch (err) {
    console.log('[video-poster] update comments: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'comments');

onRecordAfterCreateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideos(e.record, ['media']);
  } catch (err) {
    console.log('[video-poster] create tournament_posts: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_posts');

onRecordAfterUpdateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideosOnUpdate(e.record, e.record.original(), ['media']);
  } catch (err) {
    console.log('[video-poster] update tournament_posts: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_posts');

onRecordAfterCreateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideos(e.record, ['media']);
  } catch (err) {
    console.log('[video-poster] create tournament_comments: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_comments');

onRecordAfterUpdateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideosOnUpdate(e.record, e.record.original(), ['media']);
  } catch (err) {
    console.log('[video-poster] update tournament_comments: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_comments');

onRecordAfterCreateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideos(e.record, ['images']);
  } catch (err) {
    console.log('[video-poster] create products: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'products');

onRecordAfterUpdateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideosOnUpdate(e.record, e.record.original(), ['images']);
  } catch (err) {
    console.log('[video-poster] update products: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'products');

onRecordAfterCreateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideos(e.record, ['video']);
  } catch (err) {
    console.log('[video-poster] create gallery: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'gallery');

onRecordAfterUpdateSuccess((e) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
    poster.processRecordVideosOnUpdate(e.record, e.record.original(), ['video']);
  } catch (err) {
    console.log('[video-poster] update gallery: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'gallery');

routerAdd('GET', '/api/video-poster', (c) => {
  try {
    var poster = require(__hooks + '/video_poster_lib.js');
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
    var contentType = resolved.contentType || 'image/jpeg';
    c.response.header().set('Cache-Control', 'public, max-age=86400, immutable');
    return c.blob(200, contentType, bytes);
  } catch (err) {
    console.log('[video-poster] route: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

console.log('--- VIDEO POSTER LOADED ---');
