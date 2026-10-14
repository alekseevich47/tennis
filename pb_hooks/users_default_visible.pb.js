// API create
onRecordCreateRequest((e) => {
  e.record.set('is_visible', true);
  e.record.set('can_comment', true);
  e.record.set('onboarding_completed', false);
  e.record.set('name_set_in_onboarding', false);
  e.record.set('terms_accepted', false);
  e.record.set('privacy_accepted', false);
  e.record.set('publicity_accepted', false);
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
  if (!e.record.get('terms_accepted')) {
    e.record.set('terms_accepted', false);
  }
  if (!e.record.get('privacy_accepted')) {
    e.record.set('privacy_accepted', false);
  }
  if (!e.record.get('publicity_accepted')) {
    e.record.set('publicity_accepted', false);
  }
  e.next();
}, 'users');
