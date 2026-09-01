// Перекодирование видео после загрузки (posts, comments, shop, gallery).
// Требует ffmpeg в PATH или FFMPEG_PATH в env. Лимита по объёму нет.
//
// PB: onRecordCreateRequest / onRecordUpdateRequest — e.next() сразу, ffmpeg ПОСЛЕ.
// Так HTTP-ответ create/update уходит клиенту до перекодирования (не блокируем XHR).

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
    onRecordCreateRequest(function (e) {
      var record = e.record;
      var fields = target.fields;
      e.next();
      try {
        video.processRecordVideos(record, fields);
      } catch (err) {
        console.log('[video-transcode] create ' + target.collection + ': ' + err);
      }
    }, target.collection);

    onRecordUpdateRequest(function (e) {
      var record = e.record;
      var original = e.record.original();
      var fields = target.fields;
      e.next();
      try {
        video.processRecordVideosOnUpdate(record, original, fields);
      } catch (err) {
        console.log('[video-transcode] update ' + target.collection + ': ' + err);
      }
    }, target.collection);
  })(MEDIA_TARGETS[t]);
}

console.log('--- VIDEO TRANSCODE LOADED (CreateRequest/UpdateRequest) ---');
