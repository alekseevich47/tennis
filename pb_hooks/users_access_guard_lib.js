// Field-level защита привилегированных полей users.
// Файл без .pb.js — подключается через require() внутри хендлеров.
// В PB JSVM верхнеуровневые var из .pb.js хендлерам недоступны (см. botlib.js / maxauthlib.js).

var PRIVILEGED_FIELDS = [
  'role', 'is_banned', 'ban_reason', 'banned_at',
  'comment_restriction_reason', 'available_sessions', 'used_sessions',
  'attendance_count', 'membership_type', 'membership_start_date',
  'membership_end_date', 'membership_comment', 'membership_frozen',
  'membership_frozen_at', 'membership_freeze_log', 'bot_blocked', 'bot_blocked_at',
  'max_id', 'rating_points', 'wins', 'losses', 'birth_date', 'section_start_date',
  'email', 'full_name', 'is_visible', 'can_comment'
];

var BOOL_FIELDS = {
  is_banned: true,
  membership_frozen: true,
  bot_blocked: true,
  is_visible: true,
  can_comment: true
};

var NUMBER_FIELDS = {
  available_sessions: true,
  used_sessions: true,
  attendance_count: true,
  rating_points: true,
  wins: true,
  losses: true
};

function fieldChanged(original, record, f) {
  if (BOOL_FIELDS[f]) {
    return original.getBool(f) !== record.getBool(f);
  }
  if (NUMBER_FIELDS[f]) {
    return Number(original.get(f) || 0) !== Number(record.get(f) || 0);
  }
  if (f === 'membership_freeze_log') {
    var aLog = original.get(f);
    var bLog = record.get(f);
    var aStr = '';
    var bStr = '';
    try { aStr = JSON.stringify(aLog == null ? null : aLog); } catch (_) { aStr = String(aLog); }
    try { bStr = JSON.stringify(bLog == null ? null : bLog); } catch (_) { bStr = String(bLog); }
    return aStr !== bStr;
  }
  // text / email / date / select — строковое сравнение, пустое нормализуем
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
  record.set('attendance_count', 0);
  record.set('rating_points', 0);
  record.set('membership_type', 'regular');
  record.set('membership_frozen', false);
  record.set('bot_blocked', false);
}

function assertPrivilegedUpdateAllowed(original, record) {
  var isOnboardingTransition =
    !original.getBool('onboarding_completed') && record.getBool('onboarding_completed');

  for (var i = 0; i < PRIVILEGED_FIELDS.length; i++) {
    var f = PRIVILEGED_FIELDS[i];
    if (!fieldChanged(original, record, f)) continue;

    // Имя ставится в отдельном PATCH до completeOnboarding (OnboardingTutorial).
    if (f === 'full_name' &&
        !original.getBool('name_set_in_onboarding') && record.getBool('name_set_in_onboarding')) {
      continue;
    }
    if (isOnboardingTransition && (f === 'is_visible' || f === 'can_comment') &&
        record.getBool(f) === true) {
      continue;
    }
    if (f === 'birth_date' && !original.getBool('onboarding_completed')) {
      continue;
    }
    throw new ForbiddenError('Изменение поля "' + f + '" недоступно');
  }
}

module.exports = {
  applyCreateDefaults: applyCreateDefaults,
  assertPrivilegedUpdateAllowed: assertPrivilegedUpdateAllowed
};
