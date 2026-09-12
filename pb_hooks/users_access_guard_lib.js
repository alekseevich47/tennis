// Field-level ACL users: обычный user — только allow-list саморедактируемых полей.
// Файл без .pb.js — подключается через require() внутри хендлеров.
// В PB JSVM верхнеуровневые var из .pb.js хендлерам недоступны (см. botlib.js / maxauthlib.js).

/** Поля, которые обычный user может менять у себя без доп. условий. */
var SELF_EDITABLE_ALWAYS = {
  avatar: true,
  avatar_url: true,
  dominant_hand: true,
  birth_date: true,
  favorite_products: true,
  password: true,
  emailVisibility: true,
  onboarding_completed: true,
  name_set_in_onboarding: true
};

/**
 * Поля, которые могут меняться у auth-коллекции без участия клиента
 * (или не сравниваем как user-controlled).
 * membership_freeze_log / warn-поля — серверные; JSON.stringify(get()) в goja → opaque 400.
 */
var IGNORE_FIELDS = {
  id: true,
  created: true,
  updated: true,
  tokenKey: true,
  verified: true,
  membership_freeze_log: true,
  membership_expiry_warn_for: true,
  membership_expired_notified_for: true,
  freeze_expiry_warn_for: true
};

var BOOL_FIELDS = {
  is_banned: true,
  membership_frozen: true,
  bot_blocked: true,
  is_visible: true,
  can_comment: true,
  onboarding_completed: true,
  name_set_in_onboarding: true,
  emailVisibility: true
};

var NUMBER_FIELDS = {
  available_sessions: true,
  used_sessions: true,
  unpaid_sessions: true,
  attendance_count: true,
  rating_points: true,
  wins: true,
  losses: true
};

/** Relation multi: сравниваем только id, без JSON.stringify (goja/Proxy). */
function relationIdsKey(entries) {
  if (!entries || !entries.length) return '';
  var ids = [];
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!entry) continue;
    if (typeof entry === 'string') {
      ids.push(entry);
      continue;
    }
    if (typeof entry.getId === 'function') {
      ids.push(String(entry.getId()));
      continue;
    }
    if (entry.id) {
      ids.push(String(entry.id));
      continue;
    }
    ids.push(String(entry));
  }
  ids.sort();
  return ids.join(',');
}

function fieldChanged(original, record, f) {
  if (BOOL_FIELDS[f]) {
    return original.getBool(f) !== record.getBool(f);
  }
  if (NUMBER_FIELDS[f]) {
    return Number(original.get(f) || 0) !== Number(record.get(f) || 0);
  }
  if (f === 'favorite_products') {
    return relationIdsKey(original.get(f)) !== relationIdsKey(record.get(f));
  }
  if (f === 'avatar') {
    return String(original.getString(f) || '') !== String(record.getString(f) || '');
  }
  var a = original.getString(f) || '';
  var b = record.getString(f) || '';
  return a !== b;
}

function applyCreateDefaults(record) {
  record.set('role', 'user');
  record.set('is_banned', false);
  record.set('ban_reason', '');
  record.set('banned_at', '');
  record.set('available_sessions', 0);
  record.set('used_sessions', 0);
  record.set('unpaid_sessions', 0);
  record.set('attendance_count', 0);
  record.set('rating_points', 0);
  record.set('membership_type', 'regular');
  record.set('membership_frozen', false);
  record.set('bot_blocked', false);
}

/**
 * Allow-list: любое изменённое поле вне списка (с учётом онбординг-исключений) → Forbidden.
 * @param {any} original
 * @param {any} record
 */
function assertPrivilegedUpdateAllowed(original, record) {
  var isOnboardingTransition =
    !original.getBool('onboarding_completed') && record.getBool('onboarding_completed');

  var schemaFields = [
    'full_name', 'is_visible', 'is_banned', 'ban_reason', 'banned_at', 'can_comment',
    'comment_restriction_reason', 'password', 'email', 'emailVisibility', 'verified',
    'avatar', 'rating_points', 'role', 'max_id', 'dominant_hand', 'avatar_url',
    'attendance_count', 'available_sessions', 'used_sessions', 'unpaid_sessions',
    'birth_date', 'section_start_date', 'membership_type', 'membership_start_date',
    'membership_end_date', 'membership_comment', 'membership_frozen', 'membership_frozen_at',
    'membership_freeze_log', 'membership_expiry_warn_for', 'membership_expired_notified_for',
    'freeze_expiry_warn_for', 'onboarding_completed', 'name_set_in_onboarding',
    'favorite_products', 'bot_blocked', 'bot_blocked_at'
  ];

  for (var i = 0; i < schemaFields.length; i++) {
    var f = schemaFields[i];
    if (IGNORE_FIELDS[f]) continue;
    if (!fieldChanged(original, record, f)) continue;

    if (SELF_EDITABLE_ALWAYS[f]) continue;

    // Имя ставится в отдельном PATCH до completeOnboarding (OnboardingTutorial).
    if (f === 'full_name' &&
        !original.getBool('name_set_in_onboarding') && record.getBool('name_set_in_onboarding')) {
      continue;
    }
    if (isOnboardingTransition && (f === 'is_visible' || f === 'can_comment') &&
        record.getBool(f) === true) {
      continue;
    }
    throw new ForbiddenError('Изменение поля "' + f + '" недоступно');
  }
}

/**
 * Superuser (Admin UI /_/) или moderator из коллекции users.
 * @param {{ hasSuperuserAuth?: () => boolean, auth?: any }} e
 * @returns {boolean}
 */
function isPrivilegedAuth(e) {
  try {
    if (typeof e.hasSuperuserAuth === 'function' && e.hasSuperuserAuth()) return true;
  } catch (_) { /* ignore */ }

  var auth = e.auth;
  if (!auth) return false;

  try {
    if (typeof auth.isSuperuser === 'function' && auth.isSuperuser()) return true;
  } catch (_) { /* ignore */ }

  try {
    if (auth.collection && auth.collection().name === '_superusers') return true;
  } catch (_) { /* ignore */ }

  return auth.getString('role') === 'moderator';
}

module.exports = {
  applyCreateDefaults: applyCreateDefaults,
  assertPrivilegedUpdateAllowed: assertPrivilegedUpdateAllowed,
  isPrivilegedAuth: isPrivilegedAuth
};
