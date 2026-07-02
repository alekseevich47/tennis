onRecordCreateRequest((e) => {
  e.record.set('is_visible', true);
  e.record.set('can_comment', true);
  e.record.set('onboarding_completed', false);
  e.record.set('name_set_in_onboarding', false);
  e.next();
}, 'users');
