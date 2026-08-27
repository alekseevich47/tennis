// Общая логика MAX Bot API. Файл без .pb.js — подключается через require() внутри хендлеров.
// В PB JSVM хендлеры изолированы: верхнеуровневые функции из .pb.js им недоступны.

const PB_PUBLIC_BASE = $os.getenv('PB_PUBLIC_URL') || 'https://urban42.online/tt';

/**
 * HTML из PostRichTextField → markdown MAX Bot API (*bold*, _italic_).
 * Plain-text без тегов возвращается как есть (обратная совместимость).
 */
function htmlToMaxMarkdown(html) {
  if (!html) return '';
  var s = String(html);
  if (s.indexOf('<') === -1) return s;

  function decodeEntities(value) {
    return String(value)
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  function stripTags(value) {
    return decodeEntities(String(value).replace(/<[^>]+>/g, ''));
  }

  /** Вырезает .post-mention узлы (с вложенными span), оставляя читаемый label. */
  function flattenMentions(input) {
    var out = '';
    var i = 0;
    var lower = input.toLowerCase();
    while (i < input.length) {
      var idx = lower.indexOf('<span', i);
      if (idx === -1) {
        out += input.slice(i);
        break;
      }
      out += input.slice(i, idx);
      var tagEnd = input.indexOf('>', idx);
      if (tagEnd === -1) {
        out += input.slice(idx);
        break;
      }
      var openTag = input.slice(idx, tagEnd + 1);
      if (!/\bpost-mention\b/i.test(openTag)) {
        out += openTag;
        i = tagEnd + 1;
        continue;
      }
      var nameM = openTag.match(/\bdata-name="([^"]*)"/i);
      var numM = openTag.match(/\bdata-post-number="([^"]*)"/i);
      var srcM = openTag.match(/\bdata-post-source="([^"]*)"/i);
      var label = '';
      if (nameM) {
        label = decodeEntities(nameM[1]);
      } else if (numM) {
        var src = srcM && String(srcM[1]).toLowerCase() === 'tournament' ? 'Турнир' : 'Лента';
        label = '#' + numM[1] + ' ' + src;
      }
      var depth = 1;
      var j = tagEnd + 1;
      while (j < input.length && depth > 0) {
        var nextOpen = lower.indexOf('<span', j);
        var nextClose = lower.indexOf('</span>', j);
        if (nextClose === -1) {
          j = input.length;
          break;
        }
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth += 1;
          j = nextOpen + 5;
        } else {
          depth -= 1;
          j = nextClose + 7;
        }
      }
      out += label;
      i = j;
    }
    return out;
  }

  s = flattenMentions(s);

  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(div|p)>/gi, '\n');
  s = s.replace(/<(div|p)(?:\s[^>]*)?>/gi, '');

  // Несколько проходов — на случай вложенных b/i.
  for (var pass = 0; pass < 3; pass++) {
    s = s.replace(/<(strong|b)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, function (_m, _tag, inner) {
      var t = stripTags(inner).trim();
      return t ? '*' + t + '*' : '';
    });
    s = s.replace(/<(em|i)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, function (_m, _tag, inner) {
      var t = stripTags(inner).trim();
      return t ? '_' + t + '_' : '';
    });
  }

  s = s.replace(/<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/gi, function (_m, inner) {
    return stripTags(inner);
  });
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function sendBotMessage(maxId, text, attachments) {
  if (!maxId) return;
  const token = $os.getenv('MAX_BOT_TOKEN');
  if (!token) {
    console.log('[bot] MAX_BOT_TOKEN не задан — сообщение не отправлено');
    return;
  }
  try {
    const body = { text: text, format: 'markdown' };
    if (attachments && attachments.length) {
      body.attachments = attachments;
    }
    const res = $http.send({
      method: 'POST',
      url: 'https://botapi.max.ru/messages?user_id=' + Number(maxId),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(body),
      timeout: 6
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

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

function formatDateTimeGmt7(isoStr) {
  const d = new Date(new Date(isoStr || Date.now()).getTime() + GMT7_OFFSET_MS);
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' ' +
    pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
}

function getLocalDateString(dayOffset) {
  const now = new Date();
  const local = new Date(now.getTime() + GMT7_OFFSET_MS);
  local.setUTCDate(local.getUTCDate() + dayOffset);
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return local.getUTCFullYear() + '-' + pad(local.getUTCMonth() + 1) + '-' + pad(local.getUTCDate());
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
  const text = htmlToMaxMarkdown(comment.getString('text'));
  const info = getCommentPostInfo(collection, comment);

  let authorName = 'Игрок';
  try {
    const author = $app.findRecordById('users', authorId);
    if (author) authorName = author.getString('full_name') || 'Игрок';
  } catch (_) {}

  const time = formatDateTimeGmt7(new Date().toISOString());
  return '*' + authorName + '* ' + actionVerb + ' комментарий: "' + text + '"' +
    ' в *' + info.sectionName + '* на публикации №' + info.postNum + ' в ' + time;
}

function sendTrainingRemindersForDate(dateStr) {
  const filter = 'date >= "' + dateStr + ' 00:00:00" && date <= "' + dateStr + ' 23:59:59" && is_deleted = false';
  const trainings = $app.findRecordsByFilter('trainings', filter, 'date', 0, 0);

  const byUser = {};
  for (let t = 0; t < trainings.length; t++) {
    const training = trainings[t];
    const bookedUsers = training.get('booked_users') || [];
    const type = training.getString('type') === 'tournament' ? 'турнир' : 'тренировку';
    const timeFormatted = formatDateTimeGmt7(training.getString('date'));

    for (let u = 0; u < bookedUsers.length; u++) {
      const userId = bookedUsers[u];
      if (!byUser[userId]) byUser[userId] = [];
      byUser[userId].push({ type: type, timeFormatted: timeFormatted });
    }
  }

  const userIds = Object.keys(byUser);
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const items = byUser[userId];
    const parts = [];
    for (let j = 0; j < items.length; j++) {
      parts.push('*' + items[j].type + '* на *' + items[j].timeFormatted + '*');
    }
    const msg = 'Напоминаем Вам, что вы записаны на ' + parts.join(', ') +
      '. Если у Вас изменились планы — пожалуйста, снимите запись и сообщите об этом тренеру.';

    try {
      const user = $app.findRecordById('users', userId);
      const maxId = user.getString('max_id');
      if (maxId) sendBotMessage(maxId, msg);
    } catch (_) {}
  }
}

function broadcastToAllUsers(text) {
  const allUsers = $app.findRecordsByFilter('users', 'max_id != "" && is_banned != true', '', 0, 0);
  for (let i = 0; i < allUsers.length; i++) {
    sendBotMessage(allUsers[i].getString('max_id'), text);
  }
}

function broadcastToUserIds(userIds, text, attachments) {
  if (!userIds || !userIds.length) return;
  for (let i = 0; i < userIds.length; i++) {
    try {
      const user = $app.findRecordById('users', userIds[i]);
      const maxId = user.getString('max_id');
      if (maxId) sendBotMessage(maxId, text, attachments);
    } catch (_) {}
  }
}

function buildPublicFileAttachments(collectionName, recordId, filenames) {
  if (!filenames || !filenames.length) return undefined;
  const attachments = [];
  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i];
    if (!filename) continue;
    attachments.push({
      type: 'image',
      payload: {
        url: PB_PUBLIC_BASE + '/api/files/' + collectionName + '/' + recordId + '/' + filename
      }
    });
  }
  return attachments.length ? attachments : undefined;
}

function broadcastNewPublication() {
  try {
    var tpl = require(__hooks + '/templatelib.js');
    var resolved = tpl.resolve($app, 'bot.new_publication', {});
    if (!resolved || !resolved.body) return;
    broadcastToAllUsers(resolved.body);
  } catch (_) {
    broadcastToAllUsers('Появилось что-то новенькое! Зайдите в приложение 🏓');
  }
}

module.exports = {
  sendBotMessage: sendBotMessage,
  notifyModerators: notifyModerators,
  formatDateTimeGmt7: formatDateTimeGmt7,
  getLocalDateString: getLocalDateString,
  buildCommentBotMessage: buildCommentBotMessage,
  sendTrainingRemindersForDate: sendTrainingRemindersForDate,
  broadcastToAllUsers: broadcastToAllUsers,
  broadcastToUserIds: broadcastToUserIds,
  broadcastNewPublication: broadcastNewPublication,
  buildPublicFileAttachments: buildPublicFileAttachments,
  htmlToMaxMarkdown: htmlToMaxMarkdown,
  PB_PUBLIC_BASE: PB_PUBLIC_BASE
};
