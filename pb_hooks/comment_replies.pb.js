/// <reference path="../pb_data/types.d.ts" />

// In-app уведомление при ответе на комментарий.
// Логика в comment_replies_lib.js — require() внутри хендлеров (JSVM изолирует scope .pb.js).

onRecordAfterCreateSuccess((e) => {
  try {
    var lib = require(__hooks + '/comment_replies_lib.js');
    lib.notifyCommentReply(e.record.collection().name, e.record);
  } catch (err) {
    console.log('[comment_replies] create: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'comments');

onRecordAfterCreateSuccess((e) => {
  try {
    var lib = require(__hooks + '/comment_replies_lib.js');
    lib.notifyCommentReply(e.record.collection().name, e.record);
  } catch (err) {
    console.log('[comment_replies] create: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'tournament_comments');

onRecordAfterCreateSuccess((e) => {
  try {
    var lib = require(__hooks + '/comment_replies_lib.js');
    lib.notifyCommentReply(e.record.collection().name, e.record);
  } catch (err) {
    console.log('[comment_replies] create: ' + (err && err.stack ? err.stack : err));
  }
  e.next();
}, 'gallery_comments');

// Клиентский fallback после create с replyToId.
routerAdd('POST', '/api/notify-comment-reply', (c) => {
  try {
    var lib = require(__hooks + '/comment_replies_lib.js');
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth || !auth.id) {
      return c.json(401, { error: 'Unauthorized' });
    }

    var body = info.body || {};
    var collectionName = String(body.collection || '');
    var commentId = String(body.commentId || '');
    if (!lib.ALLOWED_COLLECTIONS[collectionName] || !commentId) {
      return c.json(400, { error: 'Invalid payload' });
    }

    var reply;
    try {
      reply = $app.findRecordById(collectionName, commentId);
    } catch (_) {
      return c.json(404, { error: 'Comment not found' });
    }

    if (lib.getRelationId(reply, 'author') !== String(auth.id)) {
      return c.json(403, { error: 'Forbidden' });
    }

    var created = lib.notifyCommentReply(collectionName, reply);
    return c.json(200, { ok: true, created: !!created });
  } catch (err) {
    console.log('[comment_replies] api: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Failed to create notification' });
  }
});
