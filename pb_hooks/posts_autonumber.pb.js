// Автоинкремент post_number при создании публикаций (inline в каждом обработчике — helper вне callback недоступен).

onRecordCreateRequest((e) => {
  const records = $app.findRecordsByFilter('posts', 'post_number > 0', '-post_number', 1, 0);
  const last = records.length > 0 ? records[0] : null;
  const nextNum = last ? (last.getFloat('post_number') + 1) : 1;
  e.record.set('post_number', nextNum);
  e.next();
}, 'posts');

onRecordCreateRequest((e) => {
  const records = $app.findRecordsByFilter('tournament_posts', 'post_number > 0', '-post_number', 1, 0);
  const last = records.length > 0 ? records[0] : null;
  const nextNum = last ? (last.getFloat('post_number') + 1) : 1;
  e.record.set('post_number', nextNum);
  e.next();
}, 'tournament_posts');

onRecordCreateRequest((e) => {
  const records = $app.findRecordsByFilter('gallery', 'post_number > 0', '-post_number', 1, 0);
  const last = records.length > 0 ? records[0] : null;
  const nextNum = last ? (last.getFloat('post_number') + 1) : 1;
  e.record.set('post_number', nextNum);
  e.next();
}, 'gallery');
