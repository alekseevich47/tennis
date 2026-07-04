// MAX Bot API — оповещения модераторам и пользователям.
// Логика в botlib.js; в каждом хендлере require() — PB JSVM изолирует scope хендлеров.

// 10.1a — новый пользователь → модераторам (в т.ч. при создании через max-auth)
onRecordAfterCreateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const user = e.record;
    const name = user.getString('full_name') || 'Игрок';
    const time = bot.formatDateTimeGmt7(user.getString('created') || new Date().toISOString());
    bot.notifyModerators('*' + name + '* зарегистрировался в приложении ' + time);
  } catch (err) {
    console.log('[bot] users create: ' + err);
  }
  e.next();
}, 'users');

// 10.1b — запись / снятие с тренировки → модераторам
routerAdd('POST', '/api/bot-notify-training', (c) => {
  const bot = require(__hooks + '/botlib.js');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }

  const body = info.body || {};
  const event = body.event;
  const userIds = body.userIds || (body.userId ? [body.userId] : []);
  const trainingId = body.trainingId;
  const actorId = body.actorId;
  const actorIsModerator = !!body.actorIsModerator;
  const totalBookedCount = body.totalBookedCount;

  if (!event || !userIds.length || !trainingId || !actorId || totalBookedCount == null) {
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

  const targetNames = [];
  for (let i = 0; i < userIds.length; i++) {
    try {
      const u = $app.findRecordById('users', userIds[i]);
      targetNames.push(u.getString('full_name') || 'Игрок');
    } catch (_) {
      targetNames.push('Игрок');
    }
  }
  const namesStr = targetNames.join(', ');

  let actorUser = null;
  try {
    actorUser = $app.findRecordById('users', actorId);
  } catch (_) {}

  const actorName = actorUser ? (actorUser.getString('full_name') || 'Игрок') : 'Игрок';
  const dateFormatted = bot.formatDateTimeGmt7(training.getString('date'));
  const isTournament = training.getString('type') === 'tournament';
  const typeAcc = isTournament ? 'турнир' : 'тренировку';
  const typeGen = isTournament ? 'турнира' : 'тренировки';
  const time = bot.formatDateTimeGmt7(new Date().toISOString());
  const isModAction = actorIsModerator && (userIds.length > 1 || userIds[0] !== actorId);
  const suffix = ' *' + dateFormatted + '* в ' + time + '. Всего записано: ' + totalBookedCount + '.';

  let text = '';
  if (event === 'book') {
    if (isModAction) {
      text = 'Модератор *' + actorName + '* записал ' + namesStr + ' на ' + typeAcc + suffix;
    } else {
      text = '*' + namesStr + '* записался на ' + typeAcc + suffix;
    }
  } else if (event === 'unbook') {
    if (isModAction) {
      text = 'Модератор *' + actorName + '* снял ' + namesStr + ' с ' + typeGen + suffix;
    } else {
      text = '*' + namesStr + '* снял запись с ' + typeGen + suffix;
    }
  } else {
    return c.json(400, { error: 'Invalid event' });
  }

  try {
    bot.notifyModerators(text);
  } catch (err) {
    console.log('[bot] training notify: ' + err);
  }
  return c.json(200, { success: true });
});

// Открытие / закрытие записи вручную (модератор, кнопка стоп/плей) → всем пользователям
routerAdd('POST', '/api/bot-notify-training-status', (c) => {
  const bot = require(__hooks + '/botlib.js');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const trainingId = body.trainingId;
  const isClosed = body.isClosed;
  if (!trainingId || typeof isClosed !== 'boolean') {
    return c.json(400, { error: 'Missing required fields' });
  }

  let training;
  try {
    training = $app.findRecordById('trainings', trainingId);
  } catch (_) {
    return c.json(404, { error: 'Training not found' });
  }

  const typeAcc = training.getString('type') === 'tournament' ? 'турнир' : 'тренировку';
  const statusWord = isClosed ? 'закрыта' : 'открыта';
  const text = 'Уважаемые участники, запись на ' + typeAcc + ' ' + statusWord + '.';

  try {
    bot.broadcastToAllUsers(text);
  } catch (err) {
    console.log('[bot] training status notify: ' + err);
  }
  return c.json(200, { success: true });
});

// Редактирование мероприятия (модератор) → всем пользователям
routerAdd('POST', '/api/bot-notify-training-edit', (c) => {
  const bot = require(__hooks + '/botlib.js');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const trainingId = body.trainingId;
  const changes = body.changes;
  if (!trainingId || !changes || !changes.length) {
    return c.json(400, { error: 'Missing required fields' });
  }

  let training;
  try {
    training = $app.findRecordById('trainings', trainingId);
  } catch (_) {
    return c.json(404, { error: 'Training not found' });
  }

  const fieldLabels = {
    date: 'время начала',
    location: 'место проведения',
    duration: 'длительность',
    max_slots: 'лимит мест',
    description: 'описание',
    type: 'тип мероприятия'
  };

  const formatValue = (field, value) => {
    if (field === 'date') {
      return bot.formatDateTimeGmt7(value);
    }
    if (field === 'max_slots') {
      if (value === null || value === undefined || value === '') return 'без ограничений';
      return String(value);
    }
    if (field === 'duration') {
      if (value === null || value === undefined || value === '') return 'не указано';
      return String(value);
    }
    if (field === 'type') {
      return value === 'tournament' ? 'турнир' : 'тренировка';
    }
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const phrases = [];
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const label = fieldLabels[change.field];
    if (!label) continue;
    const fromVal = formatValue(change.field, change.from);
    const toVal = formatValue(change.field, change.to);
    phrases.push(label + ' с _' + fromVal + '_ на *' + toVal + '*');
  }

  if (!phrases.length) {
    return c.json(200, { success: true });
  }

  const typeGen = training.getString('type') === 'tournament' ? 'турнира' : 'тренировки';
  const text = 'Уважаемые участники, у ' + typeGen + ' изменилось: ' + phrases.join('; ') + '.';

  try {
    bot.broadcastToAllUsers(text);
  } catch (err) {
    console.log('[bot] training edit notify: ' + err);
  }
  return c.json(200, { success: true });
});

// Создание мероприятия (модератор) → всем пользователям
routerAdd('POST', '/api/bot-notify-training-create', (c) => {
  const bot = require(__hooks + '/botlib.js');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const trainingId = body.trainingId;
  if (!trainingId) {
    return c.json(400, { error: 'Missing required fields' });
  }

  let training;
  try {
    training = $app.findRecordById('trainings', trainingId);
  } catch (_) {
    return c.json(404, { error: 'Training not found' });
  }

  const isTournament = training.getString('type') === 'tournament';
  const addedPhrase = isTournament ? 'добавлен турнир' : 'добавлена тренировка';
  const dateFormatted = bot.formatDateTimeGmt7(training.getString('date'));
  const text =
    'Уважаемые участники, в расписание ' +
    addedPhrase +
    ' на *' +
    dateFormatted +
    '*. Вы можете произвести запись в приложении.';

  try {
    bot.broadcastToAllUsers(text);
  } catch (err) {
    console.log('[bot] training create notify: ' + err);
  }
  return c.json(200, { success: true });
});

// Удаление / отмена тренировки модератором → всем пользователям
routerAdd('POST', '/api/bot-notify-training-cancelled', (c) => {
  const bot = require(__hooks + '/botlib.js');
  const info = c.requestInfo();
  const auth = info.auth;
  if (!auth) {
    return c.json(401, { error: 'Unauthorized' });
  }
  if (auth.getString('role') !== 'moderator') {
    return c.json(403, { error: 'Forbidden' });
  }

  const body = info.body || {};
  const trainingId = body.trainingId;
  if (!trainingId) {
    return c.json(400, { error: 'Missing required fields' });
  }

  let training;
  try {
    training = $app.findRecordById('trainings', trainingId);
  } catch (_) {
    return c.json(404, { error: 'Training not found' });
  }

  const typeWord = training.getString('type') === 'tournament' ? 'турнир' : 'тренировка';
  const dateFormatted = bot.formatDateTimeGmt7(training.getString('date'));
  const text =
    'Уважаемые участники, ' +
    typeWord +
    ' *' +
    dateFormatted +
    '* по техническим причинам не состоится. Количество доступных посещений будет восстановлено.';

  try {
    bot.broadcastToAllUsers(text);
  } catch (err) {
    console.log('[bot] training cancelled notify: ' + err);
  }
  return c.json(200, { success: true });
});

// Приветствие при «Начать» в боте MAX (Webhook bot_started) — без auth PB, без коллекции users
routerAdd('POST', '/api/max-bot-webhook', (c) => {
  const bot = require(__hooks + '/botlib.js');
  const WELCOME_TEXT =
    'Добро пожаловать в Секцию Миленьких! Для использования нашего приложения нажмите кнопку «Открыть»';

  try {
    const info = c.requestInfo();
    const headers = info.headers || {};
    const secretHeader =
      headers['x-max-bot-api-secret'] ||
      headers['X-Max-Bot-Api-Secret'] ||
      '';
    const expectedSecret = $os.getenv('MAX_BOT_WEBHOOK_SECRET') || '';

    if (expectedSecret) {
      if (secretHeader !== expectedSecret) {
        console.log('[bot] webhook: неверный X-Max-Bot-Api-Secret');
        return c.json(403, { error: 'Forbidden' });
      }
    } else {
      console.log('[bot] webhook: MAX_BOT_WEBHOOK_SECRET не задан — проверка секрета пропущена');
    }

    const body = info.body || {};
    console.log('[bot] webhook payload: ' + JSON.stringify(body));

    const updateType = body.update_type || body.type || '';
    if (updateType === 'bot_started') {
      const userObj = body.user || {};
      const userId =
        body.user_id ||
        userObj.user_id ||
        userObj.id ||
        body.chat_id ||
        '';
      if (userId) {
        bot.sendBotMessage(String(userId), WELCOME_TEXT);
      } else {
        console.log('[bot] webhook bot_started: user_id не найден в теле');
      }
    }
  } catch (err) {
    console.log('[bot] webhook: ' + err);
  }

  return c.json(200, { ok: true });
});

// 10.1c — новый комментарий → модераторам
onRecordAfterCreateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const collection = e.record.collection().name;
    const msg = bot.buildCommentBotMessage(e.record, collection, 'написал');
    bot.notifyModerators(msg);
  } catch (err) {
    console.log('[bot] comments create: ' + err);
  }
  e.next();
}, 'comments');

onRecordAfterCreateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const collection = e.record.collection().name;
    const msg = bot.buildCommentBotMessage(e.record, collection, 'написал');
    bot.notifyModerators(msg);
  } catch (err) {
    console.log('[bot] tournament_comments create: ' + err);
  }
  e.next();
}, 'tournament_comments');

onRecordAfterCreateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const collection = e.record.collection().name;
    const msg = bot.buildCommentBotMessage(e.record, collection, 'написал');
    bot.notifyModerators(msg);
  } catch (err) {
    console.log('[bot] gallery_comments create: ' + err);
  }
  e.next();
}, 'gallery_comments');

// 10.1d — редактирование комментария → модераторам
onRecordAfterUpdateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const record = e.record;
    const original = record.original();
    const newText = record.getString('text');
    const oldText = original ? original.getString('text') : newText;
    if (original && newText !== oldText) {
      const collection = record.collection().name;
      const msg = bot.buildCommentBotMessage(record, collection, 'отредактировал');
      bot.notifyModerators(msg);
    }
  } catch (err) {
    console.log('[bot] comments update: ' + err);
  }
  e.next();
}, 'comments');

onRecordAfterUpdateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const record = e.record;
    const original = record.original();
    const newText = record.getString('text');
    const oldText = original ? original.getString('text') : newText;
    if (original && newText !== oldText) {
      const collection = record.collection().name;
      const msg = bot.buildCommentBotMessage(record, collection, 'отредактировал');
      bot.notifyModerators(msg);
    }
  } catch (err) {
    console.log('[bot] tournament_comments update: ' + err);
  }
  e.next();
}, 'tournament_comments');

onRecordAfterUpdateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const record = e.record;
    const original = record.original();
    const newText = record.getString('text');
    const oldText = original ? original.getString('text') : newText;
    if (original && newText !== oldText) {
      const collection = record.collection().name;
      const msg = bot.buildCommentBotMessage(record, collection, 'отредактировал');
      bot.notifyModerators(msg);
    }
  } catch (err) {
    console.log('[bot] gallery_comments update: ' + err);
  }
  e.next();
}, 'gallery_comments');

// Напоминания: 16:00 GMT+7 = 09:00 UTC (вечер, завтра); 06:00 GMT+7 = 23:00 UTC (утро, «сегодня» в GMT+7 уже следующий календарный день)
cronAdd('training_reminder_evening', '0 9 * * *', () => {
  const bot = require(__hooks + '/botlib.js');
  try {
    bot.sendTrainingRemindersForDate(bot.getLocalDateString(1));
  } catch (err) {
    console.log('[bot] reminder evening: ' + err);
  }
});

cronAdd('training_reminder_morning', '0 23 * * *', () => {
  const bot = require(__hooks + '/botlib.js');
  try {
    bot.sendTrainingRemindersForDate(bot.getLocalDateString(0));
  } catch (err) {
    console.log('[bot] reminder morning: ' + err);
  }
});

// 10.2b — новая публикация → всем пользователям
onRecordAfterCreateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    bot.broadcastNewPublication();
  } catch (err) {
    console.log('[bot] posts broadcast: ' + err);
  }
  e.next();
}, 'posts');

onRecordAfterCreateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    bot.broadcastNewPublication();
  } catch (err) {
    console.log('[bot] tournament_posts broadcast: ' + err);
  }
  e.next();
}, 'tournament_posts');

console.log('--- MAX BOT NOTIFICATIONS LOADED ---');
