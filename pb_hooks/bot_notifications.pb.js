// MAX Bot API — оповещения модераторам и пользователям.
// Токен: env MAX_BOT_TOKEN ($os.getenv).

function sendBotMessage(maxId, text) {
  if (!maxId) return;
  const token = $os.getenv('MAX_BOT_TOKEN');
  if (!token) return;
  try {
    $http.send({
      method: 'POST',
      url: 'https://botapi.max.ru/messages?access_token=' + token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { chat_id: Number(maxId) },
        type: 'message',
        body: { text: text }
      }),
      timeout: 30
    });
  } catch (_) {}
}

function getModeratorMaxIds() {
  const mods = $app.findRecordsByFilter('users', 'role = "moderator" && max_id != ""', '', 0, 0);
  const ids = [];
  for (let i = 0; i < mods.length; i++) {
    ids.push(mods[i].getString('max_id'));
  }
  return ids;
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr || Date.now());
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' ' +
    pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
}

function getMoscowDateString(dayOffset) {
  const now = new Date();
  const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  msk.setUTCDate(msk.getUTCDate() + dayOffset);
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return msk.getUTCFullYear() + '-' + pad(msk.getUTCMonth() + 1) + '-' + pad(msk.getUTCDate());
}

function notifyModerators(text) {
  const ids = getModeratorMaxIds();
  for (let i = 0; i < ids.length; i++) {
    sendBotMessage(ids[i], text);
  }
}

function getCommentPostInfo(collection, comment) {
  let postId = '';
  let postCollection = 'posts';
  let sectionName = 'Лента';

  if (collection === 'comments') {
    postId = comment.getString('post');
    postCollection = 'posts';
    sectionName = 'Лента';
  } else if (collection === 'tournament_comments') {
    postId = comment.getString('post');
    postCollection = 'tournament_posts';
    sectionName = 'Соревнования';
  } else {
    postId = comment.getString('media_id');
    postCollection = 'gallery';
    sectionName = 'Галерея';
  }

  let postNum = '';
  if (postId) {
    try {
      const post = $app.findRecordById(postCollection, postId);
      postNum = String(post.getFloat('post_number') || '');
    } catch (_) {}
  }

  return { postNum: postNum, sectionName: sectionName };
}

function buildCommentBotMessage(comment, collection, actionVerb) {
  const authorId = comment.getString('author');
  const text = comment.getString('text');
  const info = getCommentPostInfo(collection, comment);

  let authorName = 'Игрок';
  try {
    const author = $app.findRecordById('users', authorId);
    if (author) authorName = author.getString('full_name') || 'Игрок';
  } catch (_) {}

  const time = formatDateTime(new Date().toISOString());
  return '*' + authorName + '* ' + actionVerb + ' комментарий: ' + text +
    ' в *' + info.sectionName + '* на публикации №' + info.postNum + ' ' + time;
}

function sendTrainingRemindersForDate(dateStr) {
  const filter = 'date >= "' + dateStr + ' 00:00:00" && date <= "' + dateStr + ' 23:59:59" && is_deleted = false';
  const trainings = $app.findRecordsByFilter('trainings', filter, 'date', 0, 0);

  for (let t = 0; t < trainings.length; t++) {
    const training = trainings[t];
    const bookedUsers = training.get('booked_users') || [];
    const type = training.getString('type') === 'tournament' ? 'турнир' : 'тренировку';
    const dateStrFormatted = formatDateTime(training.getString('date'));
    const msg = 'Напоминаем Вам, что вы записаны на *' + type + '* на *' + dateStrFormatted +
      '*. Если у Вас изменились планы — пожалуйста, снимите запись и сообщите об этом тренеру.';

    for (let u = 0; u < bookedUsers.length; u++) {
      try {
        const user = $app.findRecordById('users', bookedUsers[u]);
        const maxId = user.getString('max_id');
        if (maxId) sendBotMessage(maxId, msg);
      } catch (_) {}
    }
  }
}

// 10.1a — новый пользователь → модераторам (в т.ч. при создании через max-auth)
onRecordAfterCreateSuccess((e) => {
  const user = e.record;
  const name = user.getString('full_name') || 'Игрок';
  const time = formatDateTime(user.getString('created') || new Date().toISOString());
  notifyModerators('*' + name + '* зарегистрировался в приложении ' + time);
}, 'users');

// 10.1b — запись / снятие с тренировки → модераторам
routerAdd('POST', '/api/bot-notify-training', (c) => {
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }

  const body = info.body || {};
  const event = body.event;
  const userId = body.userId;
  const trainingId = body.trainingId;
  const actorId = body.actorId;
  const actorIsModerator = !!body.actorIsModerator;

  if (!event || !userId || !trainingId || !actorId) {
    return c.json(400, { error: 'Missing required fields' });
  }
  if (actorId !== auth.id) {
    return c.json(403, { error: 'Forbidden' });
  }

  let training;
  try {
    training = $app.findRecordById('trainings', trainingId);
  } catch (_) {
    return c.json(404, { error: 'Training not found' });
  }

  let targetUser;
  try {
    targetUser = $app.findRecordById('users', userId);
  } catch (_) {
    return c.json(404, { error: 'User not found' });
  }

  let actorUser = null;
  try {
    actorUser = $app.findRecordById('users', actorId);
  } catch (_) {}

  const targetName = targetUser.getString('full_name') || 'Игрок';
  const actorName = actorUser ? (actorUser.getString('full_name') || 'Игрок') : 'Игрок';
  const dateFormatted = formatDateTime(training.getString('date'));
  const isTournament = training.getString('type') === 'tournament';
  const typeAcc = isTournament ? 'турнир' : 'тренировку';
  const typeGen = isTournament ? 'турнира' : 'тренировки';
  const time = formatDateTime(new Date().toISOString());

  let text = '';
  if (event === 'book') {
    if (actorIsModerator && actorId !== userId) {
      text = 'Модератор *' + actorName + '* записал *' + targetName + '* на ' + typeAcc + ' *' + dateFormatted + '* ' + time;
    } else {
      text = '*' + targetName + '* записался на ' + typeAcc + ' *' + dateFormatted + '* ' + time;
    }
  } else if (event === 'unbook') {
    if (actorIsModerator && actorId !== userId) {
      text = 'Модератор *' + actorName + '* снял *' + targetName + '* с ' + typeGen + ' *' + dateFormatted + '* ' + time;
    } else {
      text = '*' + targetName + '* снял запись с ' + typeGen + ' *' + dateFormatted + '* ' + time;
    }
  } else {
    return c.json(400, { error: 'Invalid event' });
  }

  notifyModerators(text);
  return c.json(200, { success: true });
});

// 10.1c — новый комментарий → модераторам
['comments', 'tournament_comments', 'gallery_comments'].forEach(function (collection) {
  onRecordAfterCreateSuccess((e) => {
    const msg = buildCommentBotMessage(e.record, collection, 'написал');
    notifyModerators(msg);
  }, collection);
});

// 10.1d — редактирование комментария → модераторам
['comments', 'tournament_comments', 'gallery_comments'].forEach(function (collection) {
  onRecordAfterUpdateSuccess((e) => {
    const record = e.record;
    const original = record.original();
    if (!original) return;
    const newText = record.getString('text');
    const oldText = original.getString('text');
    if (newText === oldText) return;
    const msg = buildCommentBotMessage(record, collection, 'отредактировал');
    notifyModerators(msg);
  }, collection);
});

// 10.2a — напоминания о тренировках (16:00 МСК = 13:00 UTC — завтра; 06:00 МСК = 03:00 UTC — сегодня)
cronAdd('training_reminder_evening', '0 13 * * *', () => {
  sendTrainingRemindersForDate(getMoscowDateString(1));
});

cronAdd('training_reminder_morning', '0 3 * * *', () => {
  sendTrainingRemindersForDate(getMoscowDateString(0));
});

// 10.2b — новая публикация → всем пользователям
['posts', 'tournament_posts'].forEach(function (collection) {
  onRecordAfterCreateSuccess((e) => {
    $app.runInBackground(() => {
      const allUsers = $app.findRecordsByFilter('users', 'max_id != "" && is_banned = false', '', 0, 0);
      const msg = 'Появилось что-то новенькое! Зайдите в приложение 🎾';
      for (let i = 0; i < allUsers.length; i++) {
        sendBotMessage(allUsers[i].getString('max_id'), msg);
      }
    });
  }, collection);
});

console.log('--- MAX BOT NOTIFICATIONS LOADED ---');
