// Перекодирование видео через ffmpeg (posts, comments, shop, gallery).
// Требует ffmpeg в PATH или FFMPEG_PATH. Лимита по объёму нет.
//
// НЕ используем AfterCreateSuccess/AfterUpdateSuccess: код после e.next() всё равно
// блокирует ответ (unstack), ffmpeg ломает create → «Failed to create record.» при
// успешно сохранённой записи. Только cron.

var video = require(__hooks + '/videolib.js');

var MEDIA_TARGETS = [
  { collection: 'posts', fields: ['media'] },
  { collection: 'comments', fields: ['media'] },
  { collection: 'tournament_posts', fields: ['media'] },
  { collection: 'tournament_comments', fields: ['media'] },
  { collection: 'products', fields: ['images'] },
  { collection: 'gallery', fields: ['video'] }
];

var TRANSCODE_LOOKBACK_MINUTES = 20;

function recentCutoffIso() {
  return new Date(Date.now() - TRANSCODE_LOOKBACK_MINUTES * 60 * 1000).toISOString();
}

function scanCollectionForVideos(target) {
  var cutoff = recentCutoffIso();
  var filter =
    '(created >= "' +
    cutoff +
    '") || (updated >= "' +
    cutoff +
    '")';
  var records;
  try {
    records = $app.findRecordsByFilter(target.collection, filter, '-updated', 40, 0);
  } catch (err) {
    console.log('[video-transcode] cron list ' + target.collection + ': ' + err);
    return;
  }

  for (var i = 0; i < records.length; i++) {
    try {
      video.processRecordVideos(records[i], target.fields);
    } catch (err) {
      console.log('[video-transcode] cron ' + target.collection + '/' + records[i].id + ': ' + err);
    }
  }
}

cronAdd('video_transcode_scan', '*/2 * * * *', () => {
  try {
    for (var t = 0; t < MEDIA_TARGETS.length; t++) {
      scanCollectionForVideos(MEDIA_TARGETS[t]);
    }
  } catch (err) {
    console.log('[video-transcode] cron: ' + (err && err.message ? err.message : err));
  }
});

console.log('--- VIDEO TRANSCODE LOADED (cron */2) ---');
