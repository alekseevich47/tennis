// Общая логика MAX Bot API. Файл без .pb.js — подключается через require() внутри хендлеров.
// В PB JSVM хендлеры изолированы: верхнеуровневые функции из .pb.js им недоступны.

function sendBotMessage(maxId, text) {
  if (!maxId) return;
  const token = $os.getenv('MAX_BOT_TOKEN');
  if (!token) {
    console.log('[bot] MAX_BOT_TOKEN не задан — сообщение не отправлено');
    return;
  }
  try {
    const res = $http.send({
      method: 'POST',
      url: 'https://botapi.max.ru/messages?user_id=' + Number(maxId),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        text: text,
        format: 'markdown'
      }),
      timeout: 30
    });
    if (res.statusCode >= 300) {
      console.log('[bot] MAX API ' + res.statusCode + ': ' + res.raw);
    }
  } catch (err) {
    console.log('[bot] ошибка отправки: ' + err);
  }
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

function broadcastNewPublication() {
  const allUsers = $app.findRecordsByFilter('users', 'max_id != "" && is_banned != true', '', 0, 0);
  const msg = 'Появилось что-то новенькое! Зайдите в приложение 🎾';
  for (let i = 0; i < allUsers.length; i++) {
    sendBotMessage(allUsers[i].getString('max_id'), msg);
  }
}

module.exports = {
  sendBotMessage: sendBotMessage,
  notifyModerators: notifyModerators,
  formatDateTime: formatDateTime,
  getMoscowDateString: getMoscowDateString,
  buildCommentBotMessage: buildCommentBotMessage,
  sendTrainingRemindersForDate: sendTrainingRemindersForDate,
  broadcastNewPublication: broadcastNewPublication
};
