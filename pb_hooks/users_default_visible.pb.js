// API create
onRecordCreateRequest((e) => {
  e.record.set('is_visible', true);
  e.record.set('can_comment', true);
  e.record.set('onboarding_completed', false);
  e.record.set('name_set_in_onboarding', false);
  e.next();
}, 'users');

// $app.save / внутренние create (max-auth) — CreateRequest не вызывается
onRecordCreate((e) => {
  e.record.set('is_visible', true);
  e.record.set('can_comment', true);
  if (!e.record.get('onboarding_completed')) {
    e.record.set('onboarding_completed', false);
  }
  if (!e.record.get('name_set_in_onboarding')) {
    e.record.set('name_set_in_onboarding', false);
  }
  e.next();
}, 'users');
