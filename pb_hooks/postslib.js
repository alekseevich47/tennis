// Общая логика публикации запланированных постов (лента / турнир).

module.exports = {
  /**
   * Начисляет очки участникам турнирного поста (при выходе из очереди).
   * @param {*} record
   */
  applyTournamentRating(record) {
    var raw = record.get('participants');
    var participants = [];
    try {
      if (typeof raw === 'string') {
        participants = JSON.parse(raw || '[]');
      } else if (Array.isArray(raw)) {
        participants = raw;
      } else if (raw) {
        participants = raw;
      }
    } catch (_) {
      participants = [];
    }
    if (!Array.isArray(participants)) return;

    for (var i = 0; i < participants.length; i++) {
      var p = participants[i];
      if (!p || !p.userId) continue;
      var points = Number(p.points);
      if (!Number.isFinite(points) || points === 0) continue;
      try {
        var user = $app.findRecordById('users', p.userId);
        user.set('rating_points', (user.getFloat('rating_points') || 0) + points);
        $app.save(user);
      } catch (err) {
        console.log('[posts] rating apply ' + p.userId + ': ' + err);
      }
    }
  },

  /**
   * Снимает флаг очереди у всех due-записей; side-effects — в update-хуках.
   */
  dispatchDueScheduledPosts() {
    var filter = 'is_scheduled = true && scheduled_at <= @now && is_deleted != true';
    var collections = ['posts', 'tournament_posts'];

    for (var c = 0; c < collections.length; c++) {
      var collection = collections[c];
      var records = $app.findRecordsByFilter(collection, filter, 'scheduled_at', 0, 0);
      for (var i = 0; i < records.length; i++) {
        try {
          var record = records[i];
          if (!record.getBool('is_scheduled')) continue;
          record.set('is_scheduled', false);
          record.set('created', new Date());
          $app.save(record);
        } catch (err) {
          var rid = '';
          try {
            rid = records[i].id;
          } catch (_) {}
          console.log('[posts] cron ' + collection + ' ' + rid + ': ' + (err && err.stack ? err.stack : err));
        }
      }
    }
  },

  /**
   * @param {string} collection
   */
  broadcastIfEnabled(collection) {
    try {
      var bot = require(__hooks + '/botlib.js');
      var settings = $app.findFirstRecordByFilter('notification_settings', '');
      if (collection === 'posts') {
        if (settings && !settings.getBool('posts_created_enabled')) return;
        bot.broadcastNewPublication();
        return;
      }
      if (collection === 'tournament_posts') {
        if (settings && !settings.getBool('tournament_posts_created_enabled')) return;
        bot.broadcastNewPublication();
      }
    } catch (err) {
      console.log('[posts] broadcast: ' + err);
    }
  }
};
