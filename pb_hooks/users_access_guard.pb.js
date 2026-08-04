// Field-level защита привилегированных полей users.
// Имя файла раньше users_audit / users_ban_auth / users_default_visible —
// guard должен выполняться первым и иметь право throw до записи.

var PRIVILEGED_FIELDS = [
  'role', 'is_banned', 'ban_reason', 'banned_at',
  'comment_restriction_reason', 'available_sessions', 'used_sessions',
  'attendance_count', 'membership_type', 'membership_start_date',
  'membership_end_date', 'membership_comment', 'membership_frozen',
  'membership_frozen_at', 'membership_freeze_log', 'bot_blocked', 'bot_blocked_at',
  'max_id', 'rating_points', 'wins', 'losses', 'birth_date', 'section_start_date',
  'email', 'full_name', 'is_visible', 'can_comment'
];

// Defense-in-depth на create (до B3 createRule=null): не-модератор не может
// выставить себе роль/бан/сессии и т.п. при публичном создании.
onRecordCreateRequest((e) => {
  var isModerator = !!(e.auth && e.auth.getString('role') === 'moderator');
  if (!isModerator) {
    e.record.set('role', 'user');
    e.record.set('is_banned', false);
    e.record.set('ban_reason', '');
    e.record.set('banned_at', '');
    e.record.set('available_sessions', 0);
    e.record.set('used_sessions', 0);
    e.record.set('attendance_count', 0);
    e.record.set('rating_points', 0);
    e.record.set('wins', 0);
    e.record.set('losses', 0);
    e.record.set('membership_type', 'regular');
    e.record.set('membership_frozen', false);
    e.record.set('bot_blocked', false);
    // max_id не трогаем — оставляем как прислал клиент / max-auth
  }
  e.next();
}, 'users');

onRecordUpdateRequest((e) => {
  var isModerator = !!(e.auth && e.auth.getString('role') === 'moderator');
  if (!isModerator) {
    var original = e.record.original();
    var isOnboardingTransition =
      !original.getBool('onboarding_completed') && e.record.getBool('onboarding_completed');

    for (var i = 0; i < PRIVILEGED_FIELDS.length; i++) {
      var f = PRIVILEGED_FIELDS[i];
      var changed = JSON.stringify(original.get(f)) !== JSON.stringify(e.record.get(f));
      if (!changed) continue;

      // Имя ставится в отдельном PATCH до completeOnboarding (OnboardingTutorial),
      // поэтому не требуем isOnboardingTransition в том же запросе.
      if (f === 'full_name' &&
          !original.getBool('name_set_in_onboarding') && e.record.getBool('name_set_in_onboarding')) {
        continue; // одноразовый онбординг-переход
      }
      if (isOnboardingTransition && (f === 'is_visible' || f === 'can_comment') &&
          e.record.getBool(f) === true) {
        continue; // completeOnboarding выставляет их в true (безопасное направление)
      }
      // birth_date в онбординге — до completeOnboarding (тот же handleProfileSave)
      if (f === 'birth_date' && !original.getBool('onboarding_completed')) {
        continue;
      }
      throw new ForbiddenError('Изменение поля "' + f + '" недоступно');
    }
  }
  e.next();
}, 'users');
