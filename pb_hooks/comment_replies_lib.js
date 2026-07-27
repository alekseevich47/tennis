// In-app уведомление автору комментария при ответе (reply_to).
// Файл без .pb.js — require() внутри хендлеров (JSVM изолирует scope .pb.js).

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
  if (!ALLOWED_COLLECTIONS[collectionName]) {
    console.log('[comment_replies] skip: bad collection ' + collectionName);
    return false;
  }

  var replyToId = getRelationId(reply, 'reply_to');
  if (!replyToId) {
    console.log('[comment_replies] skip: empty reply_to on ' + reply.id);
    return false;
  }

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
  if (!parentAuthorId || !replyAuthorId) {
    console.log('[comment_replies] skip: missing author ids');
    return false;
  }
  if (parentAuthorId === replyAuthorId) {
    console.log('[comment_replies] skip: self-reply');
    return false;
  }

  // Дедуп: уже есть уведомление на этот ответ
  try {
    var existing = $app.findRecordsByFilter(
      'notifications',
      'recipient = "' + parentAuthorId + '"',
      '-created',
      30,
      0
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
        console.log('[comment_replies] skip: already notified ' + replyId);
        return false;
      }
    }
  } catch (dedupErr) {
    console.log('[comment_replies] dedup check: ' + dedupErr);
  }

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
    console.log('[comment_replies] created for ' + parentAuthorId + ' comment=' + reply.id);
    return true;
  } catch (errWithAction) {
    console.log('[comment_replies] save with open_comment failed, retry without: ' + errWithAction);
    try {
      notification.set('click_action', '');
      $app.save(notification);
      console.log('[comment_replies] created without click_action for ' + parentAuthorId);
      return true;
    } catch (err) {
      console.log('[comment_replies] save failed: ' + (err && err.stack ? err.stack : err));
      throw err;
    }
  }
}

module.exports = {
  ALLOWED_COLLECTIONS: ALLOWED_COLLECTIONS,
  getRelationId: getRelationId,
  notifyCommentReply: notifyCommentReply
};
