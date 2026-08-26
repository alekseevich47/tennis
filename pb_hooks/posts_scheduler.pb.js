// Крон и хуки очереди запланированных публикаций (posts / tournament_posts).

cronAdd('dispatch_scheduled_posts', '* * * * *', () => {
  try {
    const postslib = require(__hooks + '/postslib.js');
    postslib.dispatchDueScheduledPosts();
  } catch (err) {
    console.log('[posts] dispatch cron: ' + (err && err.stack ? err.stack : err));
  }
});

onRecordUpdateRequest((e) => {
  try {
    const record = e.record;
    const original = record.original();
    if (original && original.getBool('is_scheduled') && !record.getBool('is_scheduled')) {
      record.set('created', new Date());
    }
  } catch (err) {
    console.log('[posts] update request schedule: ' + err);
  }
  e.next();
}, 'posts');

onRecordUpdateRequest((e) => {
  try {
    const record = e.record;
    const original = record.original();
    if (original && original.getBool('is_scheduled') && !record.getBool('is_scheduled')) {
      record.set('created', new Date());
    }
  } catch (err) {
    console.log('[posts] update request tournament schedule: ' + err);
  }
  e.next();
}, 'tournament_posts');

onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record;
    const original = record.original();
    if (!original) {
      e.next();
      return;
    }
    if (original.getBool('is_scheduled') && !record.getBool('is_scheduled')) {
      const postslib = require(__hooks + '/postslib.js');
      postslib.broadcastIfEnabled('posts');
    }
  } catch (err) {
    console.log('[posts] after update publish: ' + err);
  }
  e.next();
}, 'posts');

onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record;
    const original = record.original();
    if (!original) {
      e.next();
      return;
    }
    if (original.getBool('is_scheduled') && !record.getBool('is_scheduled')) {
      const postslib = require(__hooks + '/postslib.js');
      postslib.applyTournamentRating(record);
      postslib.broadcastIfEnabled('tournament_posts');
    }
  } catch (err) {
    console.log('[posts] after update tournament publish: ' + err);
  }
  e.next();
}, 'tournament_posts');

console.log('--- POSTS SCHEDULER LOADED ---');
