const USERS_COLLECTION = 'users';

onRecordBeforeCreateRequest((e) => {
  e.record.set('is_visible', true);
}, USERS_COLLECTION);
