const USERS_COLLECTION = 'users';

onRecordBeforeCreateRequest((e) => {
  e.record.set('is_visible', true);
  e.record.set('can_comment', true);
}, USERS_COLLECTION);
