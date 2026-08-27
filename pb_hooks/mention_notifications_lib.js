// In-app уведомления при @-упоминании участника в посте или комментарии.
// Файл без .pb.js — require() внутри хендлеров (JSVM изолирует scope .pb.js).

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

/**
 * Уникальные user-id из HTML mention-чипов `.post-mention[data-mention=user]`.
 * @param {string} html
 * @returns {string[]}
 */
function extractUserMentionIds(html) {
  var ids = [];
  var seen = {};
  var s = String(html || '');
  var re = /<span\b[^>]*>/gi;
  var m;
  while ((m = re.exec(s)) !== null) {
    var tag = m[0];
    if (!/\bpost-mention\b/i.test(tag)) continue;
    if (!/\bdata-mention=["']user["']/i.test(tag)) continue;
    var idMatch = tag.match(/\bdata-user-id=["']([^"']+)["']/i);
    if (!idMatch) continue;
    var id = String(idMatch[1] || '').trim();
    if (!id || seen[id]) continue;
    seen[id] = true;
    ids.push(id);
  }
  return ids;
}

/**
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
function diffNewIds(a, b) {
  var oldSeen = {};
  var i;
  for (i = 0; i < a.length; i++) oldSeen[a[i]] = true;
  var out = [];
  for (i = 0; i < b.length; i++) {
    if (!oldSeen[b[i]]) out.push(b[i]);
  }
  return out;
}

/**
 * @param {string} recipientId
 * @param {string} kind
 * @param {string} sourceKey  commentId или postId
 * @returns {boolean}
 */
function alreadyNotified(recipientId, kind, sourceKey) {
  if (!recipientId || !kind || !sourceKey) return false;
  try {
    var existing = $app.findRecordsByFilter(
      'notifications',
      'recipient = "' + recipientId + '"',
      '-created',
      40,
      0
    );
    for (var i = 0; i < existing.length; i++) {
      var m = existing[i].get('meta');
      if (typeof m === 'string') {
        try {
          m = JSON.parse(m);
        } catch (_) {
          m = null;
        }
      }
      if (!m || m.kind !== kind) continue;
      if (kind === 'mention_comment' && String(m.commentId) === sourceKey) return true;
      if (kind === 'mention_post' && String(m.postId) === sourceKey) return true;
    }
  } catch (err) {
    console.log('[mention_notifications] dedup: ' + err);
  }
  return false;
}

/**
 * @param {core.Record} actor
 * @returns {{ id: string, full_name: string, collectionName: string, avatar: string, avatar_url: string }}
 */
function buildActorMeta(actor) {
  var actorName = actor.getString('full_name') || 'Игрок секции';
  var actorAvatar = '';
  try {
    actorAvatar = actor.getString('avatar') || '';
  } catch (_) {
    try {
      var rawAvatar = actor.get('avatar');
      actorAvatar = rawAvatar ? String(rawAvatar) : '';
    } catch (_) {}
  }
  return {
    id: String(actor.id),
    full_name: actorName,
    collectionName: 'users',
    avatar: actorAvatar,
    avatar_url: actor.getString('avatar_url') || ''
  };
}

/**
 * @param {core.Record} notification
 * @param {string} clickAction
 */
function saveNotification(notification, clickAction) {
  try {
    notification.set('click_action', clickAction);
    $app.save(notification);
    return true;
  } catch (errWithAction) {
    console.log('[mention_notifications] save with ' + clickAction + ' failed, retry: ' + errWithAction);
    try {
      notification.set('click_action', '');
      $app.save(notification);
      return true;
    } catch (err) {
      console.log('[mention_notifications] save failed: ' + (err && err.stack ? err.stack : err));
      return false;
    }
  }
}

/**
 * Упоминание в комментарии ленты / турнира.
 * @param {string} collectionName
 * @param {core.Record} comment
 * @param {{ onlyUserIds?: string[] }} [options]
 * @returns {number} сколько уведомлений создано
 */
function notifyCommentMentions(collectionName, comment, options) {
  options = options || {};
  if (collectionName !== 'comments' && collectionName !== 'tournament_comments') {
    return 0;
  }

  var html = '';
  try {
    html = comment.getString('text') || '';
  } catch (_) {
    html = '';
  }

  var mentioned = extractUserMentionIds(html);
  if (options.onlyUserIds && options.onlyUserIds.length) {
    var allow = {};
    for (var a = 0; a < options.onlyUserIds.length; a++) allow[options.onlyUserIds[a]] = true;
    mentioned = mentioned.filter(function (id) {
      return allow[id];
    });
  }
  if (!mentioned.length) return 0;

  var tpl;
  try {
    tpl = require(__hooks + '/templatelib.js');
  } catch (_) {
    tpl = null;
  }

  var authorId = getRelationId(comment, 'author');
  var postId = getRelationId(comment, 'post');
  if (!authorId || !postId) {
    console.log('[mention_notifications] comment skip: missing author/post');
    return 0;
  }

  var postCollection = collectionName === 'tournament_comments' ? 'tournament_posts' : 'posts';
  var postSource = collectionName === 'tournament_comments' ? 'tournament' : 'feed';
  var postNumber = 0;
  try {
    var post = $app.findRecordById(postCollection, postId);
    postNumber = Number(post.get('post_number')) || 0;
  } catch (err) {
    console.log('[mention_notifications] post lookup: ' + err);
  }

  var actor;
  try {
    actor = $app.findRecordById('users', authorId);
  } catch (err) {
    console.log('[mention_notifications] actor: ' + err);
    return 0;
  }
  if (!actor) return 0;

  var actorMeta = buildActorMeta(actor);
  var resolved = tpl
    ? tpl.resolve($app, 'app.mention_comment', { actor: actorMeta.full_name })
    : {
        title: actorMeta.full_name,
        body: 'упомянул Вас в комментариях'
      };
  if (resolved === null) {
    console.log('[mention_notifications] app.mention_comment disabled');
    return 0;
  }

  var commentId = String(comment.id);
  var created = 0;
  var notificationsCollection = $app.findCollectionByNameOrId('notifications');

  for (var i = 0; i < mentioned.length; i++) {
    var recipientId = mentioned[i];
    if (!recipientId || recipientId === authorId) continue;
    if (alreadyNotified(recipientId, 'mention_comment', commentId)) continue;

    var meta = {
      kind: 'mention_comment',
      collection: collectionName,
      commentId: commentId,
      postId: postId,
      postSource: postSource,
      postNumber: postNumber,
      actor: actorMeta
    };

    var notification = new Record(notificationsCollection);
    notification.set('recipient', recipientId);
    notification.set('title', resolved.title || actorMeta.full_name);
    notification.set('body', resolved.body || 'упомянул Вас в комментариях');
    notification.set('badge_text', '');
    notification.set('meta', meta);
    notification.set('is_read', false);

    if (saveNotification(notification, 'open_comment')) {
      created += 1;
      console.log(
        '[mention_notifications] comment mention → ' + recipientId + ' comment=' + commentId
      );
    }
  }

  return created;
}

/**
 * Упоминание в публикации ленты / турнира.
 * @param {string} collectionName
 * @param {core.Record} post
 * @param {{ onlyUserIds?: string[], force?: boolean }} [options]
 * @returns {number}
 */
function notifyPostMentions(collectionName, post, options) {
  options = options || {};
  if (collectionName !== 'posts' && collectionName !== 'tournament_posts') {
    return 0;
  }

  // Не слать, пока пост в очереди планирования
  try {
    if (post.getBool('is_scheduled') && !options.force) {
      return 0;
    }
  } catch (_) {}

  try {
    if (post.getBool('is_deleted')) return 0;
  } catch (_) {}

  var html = '';
  try {
    html = post.getString('content') || '';
  } catch (_) {
    html = '';
  }

  var mentioned = extractUserMentionIds(html);
  if (options.onlyUserIds && options.onlyUserIds.length) {
    var allow = {};
    for (var a = 0; a < options.onlyUserIds.length; a++) allow[options.onlyUserIds[a]] = true;
    mentioned = mentioned.filter(function (id) {
      return allow[id];
    });
  }
  if (!mentioned.length) return 0;

  var tpl;
  try {
    tpl = require(__hooks + '/templatelib.js');
  } catch (_) {
    tpl = null;
  }

  var authorId = getRelationId(post, 'author');
  var postId = String(post.id);
  var postSource = collectionName === 'tournament_posts' ? 'tournament' : 'feed';
  var postNumber = 0;
  try {
    postNumber = Number(post.get('post_number')) || 0;
  } catch (_) {}

  var resolved = tpl
    ? tpl.resolve($app, 'app.mention_post', {})
    : {
        title: 'Секция Миленьких',
        body: 'упомянула Вас в посте'
      };
  if (resolved === null) {
    console.log('[mention_notifications] app.mention_post disabled');
    return 0;
  }

  var navCollection = postSource === 'tournament' ? 'tournament_comments' : 'comments';
  var created = 0;
  var notificationsCollection = $app.findCollectionByNameOrId('notifications');

  for (var i = 0; i < mentioned.length; i++) {
    var recipientId = mentioned[i];
    if (!recipientId) continue;
    if (authorId && recipientId === authorId) continue;
    if (alreadyNotified(recipientId, 'mention_post', postId)) continue;

    var meta = {
      kind: 'mention_post',
      collection: navCollection,
      postId: postId,
      postSource: postSource,
      postNumber: postNumber
    };

    var notification = new Record(notificationsCollection);
    notification.set('recipient', recipientId);
    notification.set('title', resolved.title || 'Секция Миленьких');
    notification.set('body', resolved.body || 'упомянула Вас в посте');
    notification.set('badge_text', '');
    notification.set('meta', meta);
    notification.set('is_read', false);

    if (saveNotification(notification, 'open_comment')) {
      created += 1;
      console.log('[mention_notifications] post mention → ' + recipientId + ' post=' + postId);
    }
  }

  return created;
}

/**
 * Create: все упоминания. Update: только новые. Publish из schedule: все.
 * @param {string} collectionName
 * @param {core.Record} record
 * @param {core.Record | null} original
 * @returns {number}
 */
function notifyMentionsForRecord(collectionName, record, original) {
  if (collectionName === 'comments' || collectionName === 'tournament_comments') {
    if (!original) {
      return notifyCommentMentions(collectionName, record);
    }
    var oldIds = extractUserMentionIds(original.getString('text') || '');
    var newIds = extractUserMentionIds(record.getString('text') || '');
    var added = diffNewIds(oldIds, newIds);
    if (!added.length) return 0;
    return notifyCommentMentions(collectionName, record, { onlyUserIds: added });
  }

  if (collectionName === 'posts' || collectionName === 'tournament_posts') {
    if (!original) {
      return notifyPostMentions(collectionName, record);
    }

    var wasScheduled = false;
    var isScheduled = false;
    try {
      wasScheduled = original.getBool('is_scheduled');
      isScheduled = record.getBool('is_scheduled');
    } catch (_) {}

    // Выход из очереди планирования → уведомить всех упомянутых
    if (wasScheduled && !isScheduled) {
      return notifyPostMentions(collectionName, record);
    }

    if (isScheduled) return 0;

    var oldPostIds = extractUserMentionIds(original.getString('content') || '');
    var newPostIds = extractUserMentionIds(record.getString('content') || '');
    var addedPost = diffNewIds(oldPostIds, newPostIds);
    if (!addedPost.length) return 0;
    return notifyPostMentions(collectionName, record, { onlyUserIds: addedPost });
  }

  return 0;
}

module.exports = {
  extractUserMentionIds: extractUserMentionIds,
  diffNewIds: diffNewIds,
  notifyCommentMentions: notifyCommentMentions,
  notifyPostMentions: notifyPostMentions,
  notifyMentionsForRecord: notifyMentionsForRecord
};
