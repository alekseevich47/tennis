/// <reference path="../pb_data/types.d.ts" />

// In-app уведомление автору комментария при ответе (reply_to).

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
  if (entry.id) return String(entry.id);
  return String(entry);
}

/**
 * @param {string} collectionName
 * @param {core.Record} reply
 */
function notifyCommentReply(collectionName, reply) {
  var replyToId = relationId(reply.get('reply_to'));
  if (!replyToId) return;

  var parent;
  try {
    parent = $app.findRecordById(collectionName, replyToId);
  } catch (_) {
    return;
  }
  if (!parent) return;

  var parentAuthorId = relationId(parent.get('author'));
  var replyAuthorId = relationId(reply.get('author'));
  if (!parentAuthorId || !replyAuthorId || parentAuthorId === replyAuthorId) return;

  var actor;
  try {
    actor = $app.findRecordById('users', replyAuthorId);
  } catch (_) {
    return;
  }
  if (!actor) return;

  var actorName = actor.getString('full_name') || 'Игрок секции';
  var parentPlain = truncatePlain(stripHtmlToPlain(parent.getString('text')), 100);
  var replyPlain = truncatePlain(stripHtmlToPlain(reply.getString('text')), 160);

  var meta = {
    kind: 'comment_reply',
    collection: collectionName,
    commentId: reply.id,
    parentCommentId: parent.id,
    actor: {
      id: actor.id,
      full_name: actorName,
      collectionName: 'users',
      avatar: actor.get('avatar') || '',
      avatar_url: actor.getString('avatar_url') || ''
    }
  };

  if (collectionName === 'gallery_comments') {
    meta.mediaId = relationId(reply.get('media_id'));
  } else {
    meta.postId = relationId(reply.get('post'));
  }

  var notificationsCollection = $app.findCollectionByNameOrId('notifications');
  var notification = new Record(notificationsCollection);
  notification.set('recipient', parentAuthorId);
  notification.set('title', actorName);
  notification.set('body', 'ответил на ваш комментарий «' + parentPlain + '»');
  notification.set('badge_text', replyPlain);
  notification.set('click_action', 'open_comment');
  notification.set('meta', meta);
  notification.set('is_read', false);
  $app.save(notification);
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
