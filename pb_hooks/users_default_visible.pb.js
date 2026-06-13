onRecordCreateRequest((e) => {
  e.record.set('is_visible', true);
  e.record.set('can_comment', true);
  e.next();
}, 'users');
