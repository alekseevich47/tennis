// MAX Bot API — оповещения модераторам и пользователям.
// Логика в botlib.js; в каждом хендлере require() — PB JSVM изолирует scope хендлеров.

// 10.1a — новый пользователь → модераторам (в т.ч. при создании через max-auth)
onRecordAfterCreateSuccess((e) => {
  const bot = require(__hooks + '/botlib.js');
  try {
    const user = e.record;
    const name = user.getString('full_name') || 'Игрок';
    const time = bot.formatDateTime(user.getString('created') || new Date().toISOString());
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
  const dateFormatted = bot.formatDateTime(training.getString('date'));
  const isTournament = training.getString('type') === 'tournament';
  const typeAcc = isTournament ? 'турнир' : 'тренировку';
  const typeGen = isTournament ? 'турнира' : 'тренировки';
  const time = bot.formatDateTime(new Date().toISOString());

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

  try {
    bot.notifyModerators(text);
  } catch (err) {
    console.log('[bot] training notify: ' + err);
  }
  return c.json(200, { success: true });
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

// 10.2a — напоминания о тренировках (16:00 МСК = 13:00 UTC — завтра; 06:00 МСК = 03:00 UTC — сегодня)
cronAdd('training_reminder_evening', '0 13 * * *', () => {
  const bot = require(__hooks + '/botlib.js');
  try {
    bot.sendTrainingRemindersForDate(bot.getMoscowDateString(1));
  } catch (err) {
    console.log('[bot] reminder evening: ' + err);
  }
});

cronAdd('training_reminder_morning', '0 3 * * *', () => {
  const bot = require(__hooks + '/botlib.js');
  try {
    bot.sendTrainingRemindersForDate(bot.getMoscowDateString(0));
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
