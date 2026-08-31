// Перекодирование видео после загрузки (posts, comments, shop, gallery).
// Требует ffmpeg в PATH или FFMPEG_PATH в env. Лимита по объёму нет.

var video = require(__hooks + '/videolib.js');

var MEDIA_TARGETS = [
  { collection: 'posts', fields: ['media'] },
  { collection: 'comments', fields: ['media'] },
  { collection: 'tournament_posts', fields: ['media'] },
  { collection: 'tournament_comments', fields: ['media'] },
  { collection: 'products', fields: ['images'] },
  { collection: 'gallery', fields: ['video'] }
];

for (var t = 0; t < MEDIA_TARGETS.length; t++) {
  (function (target) {
    onRecordAfterCreateSuccess(function (e) {
      try {
        video.processRecordVideos(e.record, target.fields);
      } catch (err) {
        console.log('[video-transcode] create ' + target.collection + ': ' + err);
      }
    }, target.collection);

    onRecordAfterUpdateSuccess(function (e) {
      try {
        video.processRecordVideosOnUpdate(e.record, e.record.original(), target.fields);
      } catch (err) {
        console.log('[video-transcode] update ' + target.collection + ': ' + err);
      }
    }, target.collection);
  })(MEDIA_TARGETS[t]);
}
