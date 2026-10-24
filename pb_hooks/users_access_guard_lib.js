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
  name_set_in_onboarding: true,
  // Юридические согласия — только false→true (см. assertPrivilegedUpdateAllowed).
  terms_accepted: true,
  privacy_accepted: true,
  publicity_accepted: true,
  legal_accepted_at: true
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
  // JSON/warn — сравниваем отдельно в assertMembershipLifecycleFieldsUnchanged
  // (избегаем JSON.stringify в goja для прочих путей).
  membership_freeze_log: true,
  membership_period_log: true,
  membership_expiry_warn_for: true,
  membership_expired_notified_for: true,
  freeze_expiry_warn_for: true,
  freeze_tomorrow_warn_for: true
};

/**
 * Freeze/stop lifecycle — только API ($app.save) или superuser Admin UI.
 * Обычный user и moderator не могут PATCH эти поля напрямую.
 */
var MEMBERSHIP_LIFECYCLE_FIELDS = [
  'membership_frozen',
  'membership_frozen_at',
  'membership_freeze_log',
  'membership_period_log',
  'membership_freeze_used_days',
  'membership_freeze_planned_until',
  'membership_stopped',
  'membership_stopped_at',
  'freeze_expiry_warn_for',
  'freeze_tomorrow_warn_for'
];

var BOOL_FIELDS = {
  is_banned: true,
  membership_frozen: true,
  membership_stopped: true,
  bot_blocked: true,
  max_bot_blocked: true,
  tg_bot_blocked: true,
  is_visible: true,
  is_coach: true,
  can_comment: true,
  onboarding_completed: true,
  name_set_in_onboarding: true,
  terms_accepted: true,
  privacy_accepted: true,
  publicity_accepted: true,
  emailVisibility: true
};

/** Согласия: клиент может только принять (false→true), не снять. */
var CONSENT_BOOL_FIELDS = {
  terms_accepted: true,
  privacy_accepted: true,
  publicity_accepted: true
};

var NUMBER_FIELDS = {
  available_sessions: true,
  used_sessions: true,
  unpaid_sessions: true,
  attendance_count: true,
  rating_points: true,
  wins: true,
  losses: true,
  membership_freeze_used_days: true
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
  record.set('is_coach', false);
  record.set('ban_reason', '');
  record.set('banned_at', '');
  record.set('available_sessions', 0);
  record.set('used_sessions', 0);
  record.set('unpaid_sessions', 0);
  record.set('attendance_count', 0);
  record.set('rating_points', 0);
  record.set('membership_type', 'regular');
  record.set('membership_frozen', false);
  record.set('membership_stopped', false);
  record.set('membership_freeze_used_days', 0);
  record.set('bot_blocked', false);
  record.set('max_bot_blocked', false);
  record.set('tg_bot_blocked', false);
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
    'full_name', 'is_visible', 'is_coach', 'is_banned', 'ban_reason', 'banned_at', 'can_comment',
    'comment_restriction_reason', 'password', 'email', 'emailVisibility', 'verified',
    'avatar', 'rating_points', 'role', 'max_id', 'dominant_hand', 'avatar_url',
    'attendance_count', 'available_sessions', 'used_sessions', 'unpaid_sessions',
    'birth_date', 'section_start_date', 'membership_type', 'membership_start_date',
    'membership_end_date', 'membership_comment', 'membership_frozen', 'membership_frozen_at',
    'membership_freeze_log', 'membership_period_log', 'membership_freeze_used_days',
    'membership_freeze_planned_until',
    'membership_stopped', 'membership_stopped_at',
    'membership_expiry_warn_for', 'membership_expired_notified_for',
    'freeze_expiry_warn_for', 'freeze_tomorrow_warn_for',
    'onboarding_completed', 'name_set_in_onboarding',
    'terms_accepted', 'privacy_accepted', 'publicity_accepted', 'legal_accepted_at',
    'favorite_products', 'bot_blocked', 'bot_blocked_at',
    // Telegram / агрегат блокировок — только сервер (tg-auth, webhook, claim), не self-edit.
    'tg_id', 'max_bot_blocked', 'tg_bot_blocked', 'tg_bot_blocked_at'
  ];

  for (var i = 0; i < schemaFields.length; i++) {
    var f = schemaFields[i];
    if (IGNORE_FIELDS[f]) continue;
    if (!fieldChanged(original, record, f)) continue;

    // Согласия: запрет снять true→false обычным user (отзыв — через модератора / Admin).
    if (CONSENT_BOOL_FIELDS[f]) {
      if (original.getBool(f) === true && record.getBool(f) === false) {
        throw new ForbiddenError('Изменение поля "' + f + '" недоступно');
      }
      if (SELF_EDITABLE_ALWAYS[f]) continue;
    }

    if (f === 'legal_accepted_at' && SELF_EDITABLE_ALWAYS[f]) {
      // Разрешаем только первую установку / обновление даты при повторном подтверждении;
      // обнуление даты обычным user запрещаем.
      var prevAt = String(original.getString('legal_accepted_at') || '');
      var nextAt = String(record.getString('legal_accepted_at') || '');
      if (prevAt && !nextAt) {
        throw new ForbiddenError('Изменение поля "legal_accepted_at" недоступно');
      }
      continue;
    }

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

  // Завершение онбординга без принятых согласий — запрещено.
  if (isOnboardingTransition) {
    if (!record.getBool('terms_accepted') ||
        !record.getBool('privacy_accepted') ||
        !record.getBool('publicity_accepted')) {
      throw new ForbiddenError('Необходимо принять пользовательское соглашение и согласия на обработку данных');
    }
  }
}

/**
 * Поля, которые меняет ТОЛЬКО сервер ($app.save из tg-auth / webhook / claim).
 * Через API их не может PATCH-ить даже moderator (только superuser в Admin UI).
 */
var SERVER_ONLY_FIELDS = ['tg_id', 'max_bot_blocked', 'tg_bot_blocked', 'tg_bot_blocked_at'];

function freezeLogKey(raw) {
  try {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    return JSON.stringify(raw);
  } catch (_) {
    return String(raw || '');
  }
}

/**
 * Freeze/stop lifecycle fields — только /api/membership-freeze|stop или superuser.
 * @param {any} original
 * @param {any} record
 */
function assertMembershipLifecycleFieldsUnchanged(original, record) {
  var i;
  for (i = 0; i < MEMBERSHIP_LIFECYCLE_FIELDS.length; i++) {
    var f = MEMBERSHIP_LIFECYCLE_FIELDS[i];
    if (f === 'membership_freeze_log' || f === 'membership_period_log') {
      if (freezeLogKey(original.get(f)) !== freezeLogKey(record.get(f))) {
        throw new ForbiddenError(
          f === 'membership_period_log'
            ? 'Изменение поля "' + f + '" недоступно'
            : 'Изменение поля "' + f + '" недоступно (используйте API заморозки)'
        );
      }
      continue;
    }
    if (fieldChanged(original, record, f)) {
      throw new ForbiddenError('Изменение поля "' + f + '" недоступно (используйте API заморозки)');
    }
  }
}

/**
 * @param {any} original
 * @param {any} record
 */
function assertServerOnlyFieldsUnchanged(original, record) {
  for (var i = 0; i < SERVER_ONLY_FIELDS.length; i++) {
    var f = SERVER_ONLY_FIELDS[i];
    if (fieldChanged(original, record, f)) {
      throw new ForbiddenError('Изменение поля "' + f + '" недоступно');
    }
  }
}

/**
 * При смене membership_start_date сбрасывает бюджет freeze (на record до save).
 * @param {any} original
 * @param {any} record
 */
function maybeResetFreezeBudgetOnStartDateChange(original, record) {
  if (!original || !record) return;
  try {
    var lib = require(__hooks + '/membershiplib.js');
    lib.resetFreezeBudgetIfStartChanged(original, record);
  } catch (err) {
    console.log('[users-access-guard] freeze budget reset: ' + err);
  }
}

/**
 * Смена type/дат: period_log + сброс freeze/stop при типе без поддержки.
 * @param {any} original
 * @param {any} record
 * @param {any} [actor]
 */
function maybeApplyMembershipEditSideEffects(original, record, actor) {
  if (!original || !record) return;
  try {
    var lib = require(__hooks + '/membershiplib.js');
    lib.applyMembershipEditSideEffects(original, record, actor || null);
  } catch (err) {
    console.log('[users-access-guard] membership edit side effects: ' + err);
  }
}

/**
 * @param {{ hasSuperuserAuth?: () => boolean, auth?: any }} e
 * @returns {boolean}
 */
function isSuperuserAuth(e) {
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
  return false;
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
  assertServerOnlyFieldsUnchanged: assertServerOnlyFieldsUnchanged,
  assertMembershipLifecycleFieldsUnchanged: assertMembershipLifecycleFieldsUnchanged,
  maybeResetFreezeBudgetOnStartDateChange: maybeResetFreezeBudgetOnStartDateChange,
  maybeApplyMembershipEditSideEffects: maybeApplyMembershipEditSideEffects,
  isPrivilegedAuth: isPrivilegedAuth,
  isSuperuserAuth: isSuperuserAuth
};
