/// <reference path="../pb_data/types.d.ts" />

// In-app уведомление автору комментария при ответе (reply_to).
// Хук afterCreate + POST /api/notify-comment-reply (клиент после create с replyToId).

function stripHtmlToPlain(html) {
  if (!html) return '';
  var s = String(html);
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<\/(p|div|li|h[1-6])>/gi, ' ');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return s.replace(/[\u200B\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncatePlain(text, maxLen) {
  text = text || '';
  maxLen = maxLen || 120;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function relationId(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry.getId === 'function') return entry.getId();
  if (entry.id) return String(entry.id);
  return String(entry);
}

/**
 * @param {core.Record} record
 * @param {string} field
 */
function getRelationId(record, field) {
  try {
    var asString = record.getString(field);
    if (asString) return String(asString);
  } catch (_) {}
  try {
    return relationId(record.get(field));
  } catch (_) {
    return '';
  }
}

var ALLOWED_COLLECTIONS = {
  comments: true,
  tournament_comments: true,
  gallery_comments: true
};

/**
 * @param {string} collectionName
 * @param {core.Record} reply
 * @returns {boolean}
 */
function notifyCommentReply(collectionName, reply) {
  if (!ALLOWED_COLLECTIONS[collectionName]) return false;

  var replyToId = getRelationId(reply, 'reply_to');
  if (!replyToId) return false;

  var parent;
  try {
    parent = $app.findRecordById(collectionName, replyToId);
  } catch (err) {
    console.log('[comment_replies] parent not found: ' + err);
    return false;
  }
  if (!parent) return false;

  var parentAuthorId = getRelationId(parent, 'author');
  var replyAuthorId = getRelationId(reply, 'author');
  if (!parentAuthorId || !replyAuthorId || parentAuthorId === replyAuthorId) return false;

  // Дедуп: уже есть уведомление на этот ответ
  try {
    var existing = $app.findRecordsByFilter(
      'notifications',
      'recipient = {:recipient}',
      '-created',
      20,
      0,
      { recipient: parentAuthorId }
    );
    var replyId = String(reply.id);
    for (var i = 0; i < existing.length; i++) {
      var m = existing[i].get('meta');
      if (typeof m === 'string') {
        try {
          m = JSON.parse(m);
        } catch (_) {
          m = null;
        }
      }
      if (m && m.kind === 'comment_reply' && String(m.commentId) === replyId) {
        return false;
      }
    }
  } catch (_) {}

  var actor;
  try {
    actor = $app.findRecordById('users', replyAuthorId);
  } catch (err) {
    console.log('[comment_replies] actor not found: ' + err);
    return false;
  }
  if (!actor) return false;

  var actorName = actor.getString('full_name') || 'Игрок секции';
  var parentPlain = truncatePlain(stripHtmlToPlain(parent.getString('text')), 100);
  var replyPlain = truncatePlain(stripHtmlToPlain(reply.getString('text')), 160);

  var actorAvatar = '';
  try {
    actorAvatar = actor.getString('avatar') || '';
  } catch (_) {
    try {
      var rawAvatar = actor.get('avatar');
      actorAvatar = rawAvatar ? String(rawAvatar) : '';
    } catch (_) {}
  }

  var meta = {
    kind: 'comment_reply',
    collection: collectionName,
    commentId: String(reply.id),
    parentCommentId: String(parent.id),
    actor: {
      id: String(actor.id),
      full_name: actorName,
      collectionName: 'users',
      avatar: actorAvatar,
      avatar_url: actor.getString('avatar_url') || ''
    }
  };

  if (collectionName === 'gallery_comments') {
    meta.mediaId = getRelationId(reply, 'media_id');
  } else {
    meta.postId = getRelationId(reply, 'post');
  }

  var notificationsCollection = $app.findCollectionByNameOrId('notifications');
  var notification = new Record(notificationsCollection);
  notification.set('recipient', parentAuthorId);
  notification.set('title', actorName);
  notification.set('body', 'ответил на ваш комментарий «' + parentPlain + '»');
  notification.set('badge_text', replyPlain);
  notification.set('meta', meta);
  notification.set('is_read', false);

  try {
    notification.set('click_action', 'open_comment');
    $app.save(notification);
    return true;
  } catch (errWithAction) {
    console.log('[comment_replies] save with open_comment failed, retry without: ' + errWithAction);
    try {
      notification.set('click_action', '');
      $app.save(notification);
      return true;
    } catch (err) {
      console.log('[comment_replies] save failed: ' + err);
      throw err;
    }
  }
}

function handleReplyCreate(e) {
  try {
    notifyCommentReply(e.record.collection().name, e.record);
  } catch (err) {
    console.log('[comment_replies] create: ' + err);
  }
  e.next();
}

onRecordAfterCreateSuccess(handleReplyCreate, 'comments');
onRecordAfterCreateSuccess(handleReplyCreate, 'tournament_comments');
onRecordAfterCreateSuccess(handleReplyCreate, 'gallery_comments');

// Клиентский fallback после create с replyToId (если хук не сработал / схема без open_comment).
routerAdd('POST', '/api/notify-comment-reply', (c) => {
  var info = c.requestInfo();
  var auth = info.auth;
  if (!auth || !auth.id) {
    return c.json(401, { error: 'Unauthorized' });
  }

  var data = info.data || {};
  var collectionName = String(data.collection || '');
  var commentId = String(data.commentId || '');
  if (!ALLOWED_COLLECTIONS[collectionName] || !commentId) {
    return c.json(400, { error: 'Invalid payload' });
  }

  var reply;
  try {
    reply = $app.findRecordById(collectionName, commentId);
  } catch (_) {
    return c.json(404, { error: 'Comment not found' });
  }

  if (getRelationId(reply, 'author') !== String(auth.id)) {
    return c.json(403, { error: 'Forbidden' });
  }

  try {
    var created = notifyCommentReply(collectionName, reply);
    return c.json(200, { ok: true, created: !!created });
  } catch (err) {
    console.log('[comment_replies] api: ' + err);
    return c.json(500, { error: 'Failed to create notification' });
  }
});
