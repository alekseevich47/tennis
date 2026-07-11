// Серверный аудит-лог (коллекция audit_events). Файл без .pb.js — require() внутри хендлеров/cron.
// PB 0.23+: субъект запроса — e.auth (fallback: e.requestInfo().auth).

function resolveAuth(e) {
  if (!e) return null;
  try {
    var auth = e.auth;
    if (auth && auth.id) return auth;
  } catch (_) {}
  try {
    var info = e.requestInfo();
    if (info && info.auth && info.auth.id) return info.auth;
  } catch (_) {}
  return null;
}

function actorInfo(auth) {
  if (!auth || !auth.id) return null;
  var fullName = '';
  var role = 'user';
  try {
    fullName = auth.getString('full_name') || '';
  } catch (_) {}
  if (!fullName) {
    try {
      fullName = auth.get('full_name') || '';
    } catch (_) {}
  }
  try {
    role = auth.getString('role') || 'user';
  } catch (_) {}
  var label = fullName;
  if (role) {
    label = fullName ? fullName + ' (' + role + ')' : role;
  }
  return { id: auth.id, label: label, role: role };
}

function fieldValue(record, fieldName) {
  if (!record) return null;
  try {
    if (typeof record.getRaw === 'function') return record.getRaw(fieldName);
  } catch (_) {}
  try {
    return record.get(fieldName);
  } catch (_) {}
  return null;
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return String(a) === String(b);
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    var i;
    for (i = 0; i < a.length; i++) {
      if (!valuesEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_) {
      return false;
    }
  }
  return false;
}

function diffFields(original, record, fields) {
  var diff = [];
  if (!original || !record || !fields || !fields.length) return diff;
  var i;
  for (i = 0; i < fields.length; i++) {
    var field = fields[i];
    var fromVal = fieldValue(original, field);
    var toVal = fieldValue(record, field);
    if (!valuesEqual(fromVal, toVal)) {
      diff.push({ field: field, from: fromVal, to: toVal });
    }
  }
  return diff;
}

function relationId(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry.getId === 'function') return entry.getId();
  if (entry.id) return String(entry.id);
  return String(entry);
}

function normalizeRelationIds(entries) {
  var ids = [];
  var i;
  if (!entries) return ids;
  for (i = 0; i < entries.length; i++) {
    var id = relationId(entries[i]);
    if (id) ids.push(id);
  }
  return ids;
}

function newlyAdded(oldArr, newArr) {
  var oldIds = normalizeRelationIds(oldArr || []);
  var newIds = normalizeRelationIds(newArr || []);
  var added = [];
  var i;
  for (i = 0; i < newIds.length; i++) {
    if (oldIds.indexOf(newIds[i]) === -1) added.push(newIds[i]);
  }
  return added;
}

function newlyRemoved(oldArr, newArr) {
  var oldIds = normalizeRelationIds(oldArr || []);
  var newIds = normalizeRelationIds(newArr || []);
  var removed = [];
  var i;
  for (i = 0; i < oldIds.length; i++) {
    if (newIds.indexOf(oldIds[i]) === -1) removed.push(oldIds[i]);
  }
  return removed;
}

function displayName(actor) {
  if (!actor || !actor.label) return 'Пользователь';
  var label = actor.label;
  var idx = label.indexOf(' (');
  return idx > -1 ? label.slice(0, idx) : label;
}

function resolveUser(app, userId) {
  if (!userId) return null;
  try {
    var user = app.findRecordById('users', userId);
    if (user) {
      return { id: userId, label: user.getString('full_name') || 'Игрок' };
    }
  } catch (_) {}
  return { id: userId, label: 'Игрок' };
}

function resolveCommentAuthor(app, record, original) {
  var authorId = '';
  try {
    authorId = record.getString('author') || '';
  } catch (_) {}
  if (!authorId && original) {
    try {
      authorId = original.getString('author') || '';
    } catch (_) {}
  }
  return resolveUser(app, authorId);
}

function buildCommentDetails(opts) {
  opts = opts || {};
  var details = {
    commentId: opts.commentId || '',
    text: opts.text || '',
    authorId: opts.author && opts.author.id ? opts.author.id : '',
    authorName: opts.author && opts.author.label ? opts.author.label : ''
  };
  if (opts.actor && opts.actor.id) {
    details.actorId = opts.actor.id;
    details.actorName = displayName(opts.actor);
  }
  if (opts.extra) {
    var k;
    for (k in opts.extra) {
      if (Object.prototype.hasOwnProperty.call(opts.extra, k)) {
        details[k] = opts.extra[k];
      }
    }
  }
  return details;
}

function truncateText(text, maxLen) {
  text = text || '';
  maxLen = maxLen || 80;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function logEvent(app, payload) {
  try {
    payload = payload || {};
    var collection = app.findCollectionByNameOrId('audit_events');
    var record = new Record(collection);

    if (payload.category) record.set('category', payload.category);
    if (payload.action) record.set('action', payload.action);
    record.set('action_kind', payload.actionKind || 'other');

    var subject = payload.subject;
    if (subject && subject.id) {
      record.set('subject_id', subject.id);
      record.set('subject_label', subject.label || '');
      record.set('subject_source', subject.source || payload.subjectSource || 'self');
    } else {
      record.set('subject_source', payload.subjectSource || 'system');
    }

    var target = payload.target;
    if (target && target.id) {
      record.set('target_id', target.id);
      if (target.label) record.set('target_label', target.label);
    }

    if (payload.objectType) record.set('object_type', payload.objectType);
    if (payload.objectId != null && payload.objectId !== '') {
      record.set('object_id', String(payload.objectId));
    }
    if (payload.objectLabel) record.set('object_label', payload.objectLabel);
    if (payload.effectiveAt) record.set('effective_at', payload.effectiveAt);
    if (payload.diff) record.set('diff', payload.diff);
    if (payload.details) record.set('details', payload.details);
    if (payload.summaryRu) record.set('summary_ru', payload.summaryRu);
    record.set('severity', payload.severity || 'info');
    if (payload.isError === true) record.set('is_error', true);

    app.save(record);
  } catch (err) {
    console.log('[audit] ' + err);
  }
}

module.exports = {
  resolveAuth: resolveAuth,
  actorInfo: actorInfo,
  displayName: displayName,
  resolveUser: resolveUser,
  resolveCommentAuthor: resolveCommentAuthor,
  buildCommentDetails: buildCommentDetails,
  truncateText: truncateText,
  diffFields: diffFields,
  newlyAdded: newlyAdded,
  newlyRemoved: newlyRemoved,
  logEvent: logEvent
};
