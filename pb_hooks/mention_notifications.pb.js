/// <reference path="../pb_data/types.d.ts" />

// In-app уведомления при @-упоминании участника (пост / комментарий ленты и турнира).
// Логика в mention_notifications_lib.js — require() внутри хендлеров.

onRecordAfterCreateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, null);
  } catch (err) {
    console.log('[mention_notifications] create: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'comments');

onRecordAfterCreateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, null);
  } catch (err) {
    console.log('[mention_notifications] create: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_comments');

onRecordAfterUpdateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, e.record.original());
  } catch (err) {
    console.log('[mention_notifications] update: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'comments');

onRecordAfterUpdateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, e.record.original());
  } catch (err) {
    console.log('[mention_notifications] update: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_comments');

onRecordAfterCreateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, null);
  } catch (err) {
    console.log('[mention_notifications] create post: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'posts');

onRecordAfterCreateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, null);
  } catch (err) {
    console.log('[mention_notifications] create post: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_posts');

onRecordAfterUpdateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, e.record.original());
  } catch (err) {
    console.log('[mention_notifications] update post: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'posts');

onRecordAfterUpdateSuccess((e) => {
  try {
    var lib = require(__hooks + '/mention_notifications_lib.js');
    lib.notifyMentionsForRecord(e.record.collection().name, e.record, e.record.original());
  } catch (err) {
    console.log('[mention_notifications] update post: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_posts');

console.log('--- MENTION NOTIFICATIONS LOADED ---');
