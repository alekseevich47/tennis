// Перекодирование видео через ffmpeg (posts, comments, shop, gallery).
// Требует ffmpeg в PATH или FFMPEG_PATH.
//
// НЕ AfterCreateSuccess — ffmpeg блокирует unstack и ломает create.
// Сразу после upload: POST /api/video-transcode-now (клиент, fire-and-forget).
// Cron */2 — fallback для пропущенных записей.

cronAdd('video_transcode_scan', '*/2 * * * *', () => {
  try {
    var video = require(__hooks + '/videolib.js');
    video.runTranscodeCronScan();
  } catch (err) {
    console.log('[video-transcode] cron: ' + (err && err.message ? err.message : err));
  }
});

routerAdd('POST', '/api/video-transcode-now', (c) => {
  try {
    var video = require(__hooks + '/videolib.js');
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth || !auth.id) {
      return c.json(401, { error: 'Unauthorized' });
    }

    var body = info.body || {};
    var collectionName = String(body.collection || '');
    var recordId = String(body.recordId || '');
    if (!video.getMediaTarget(collectionName) || !recordId) {
      return c.json(400, { error: 'Invalid payload' });
    }

    var record;
    try {
      record = $app.findRecordById(collectionName, recordId);
    } catch (_) {
      return c.json(404, { error: 'Record not found' });
    }

    if (!video.canAuthTranscode(auth, record)) {
      return c.json(403, { error: 'Forbidden' });
    }

    var result = video.transcodeRecordNow(collectionName, recordId);
    if (result.error === 'not_found') {
      return c.json(404, { error: 'Record not found' });
    }
    if (result.error) {
      return c.json(400, { error: result.error });
    }

    return c.json(200, { ok: true });
  } catch (err) {
    console.log('[video-transcode] api: ' + (err && err.message ? err.message : err));
    return c.json(500, { error: 'Transcode failed' });
  }
});

console.log('--- VIDEO TRANSCODE LOADED (api + cron */2) ---');
