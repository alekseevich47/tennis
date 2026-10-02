// Telegram Bot API — транспорт сообщений. Файл без .pb.js — require() внутри хендлеров.
// Токен — только env TG_BOT_TOKEN; URL с токеном НИКОГДА не логировать.
// Тексты бота пишутся в MAX-markdown (*bold*, _italic_) → конвертируем в Telegram HTML.

var TG_API_BASE = 'https://api.telegram.org/bot';
var TG_CAPTION_LIMIT = 1024;
var TG_TEXT_LIMIT = 4000; // запас до лимита Telegram 4096
var TG_MEDIA_GROUP_MAX = 10;

function getTgToken() {
  return $os.getenv('TG_BOT_TOKEN') || '';
}

function isTgConfigured() {
  return !!getTgToken();
}

/** Только цифры (Telegram user id, допускается отрицательный chat id). */
function normalizeTgId(value) {
  if (value == null) return '';
  var s = String(value).trim();
  return /^-?\d{1,20}$/.test(s) ? s : '';
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** MAX-markdown → Telegram HTML (parse_mode=HTML). Ошибки разметки ловит fallback plain. */
function maxMarkdownToTelegramHtml(text) {
  var s = escapeHtml(text);
  s = s.replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(«"'>])_([^_\n]+)_(?=$|[\s).,!?:;»"'<])/g, '$1<i>$2</i>');
  return s;
}

/** MAX-markdown → plain (снимаем маркеры). */
function maxMarkdownToPlain(text) {
  return String(text == null ? '' : text)
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(^|[\s(«"'])_([^_\n]+)_(?=$|[\s).,!?:;»"'])/g, '$1$2');
}

function parseJson(res) {
  try {
    if (res && res.json) return res.json;
    return JSON.parse((res && res.raw) || '{}');
  } catch (_) {
    return {};
  }
}

function describe(json) {
  return String((json && json.description) || '').slice(0, 200);
}

function guessImageMime(filename) {
  var lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Multipart body без FormData (в PB JSVM его может не быть) — как botlib.uploadImageToMax.
 * @param {Array<{ name: string, filename?: string, value: string, isFile?: boolean }>} parts
 * @returns {{ body: string, contentType: string }}
 */
function buildMultipart(parts) {
  // Конкатенация строк (как uploadImageToMax) — Array.join в JSVM ломает бинарные куски.
  var boundary = '----TgBot' + Date.now() + Math.floor(Math.random() * 1e6);
  var body = '';
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var head = '--' + boundary + '\r\nContent-Disposition: form-data; name="' + p.name + '"';
    if (p.filename) {
      head += '; filename="' + String(p.filename).replace(/"/g, '') + '"\r\nContent-Type: ' + guessImageMime(p.filename);
    }
    head += '\r\n\r\n';
    body += head;
    body += p.value == null ? '' : p.value;
    body += '\r\n';
  }
  body += '--' + boundary + '--\r\n';
  return { body: body, contentType: 'multipart/form-data; boundary=' + boundary };
}

/**
 * Режет исходный MAX-markdown по \\n на куски ≤ limit; слишком длинную строку — жёстко.
 * Конвертация в HTML — отдельно на каждый кусок (теги внутри куска сбалансированы).
 * @param {string} text
 * @param {number} [limit]
 * @returns {string[]}
 */
function splitForTelegram(text, limit) {
  var max = limit || TG_TEXT_LIMIT;
  var src = String(text == null ? '' : text);
  if (!src) return [];
  if (src.length <= max) return [src];

  var lines = src.split('\n');
  var chunks = [];
  var cur = '';
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.length > max) {
      if (cur) {
        chunks.push(cur);
        cur = '';
      }
      for (var j = 0; j < line.length; j += max) {
        chunks.push(line.slice(j, j + max));
      }
      continue;
    }
    var candidate = cur ? cur + '\n' + line : line;
    if (candidate.length > max) {
      if (cur) chunks.push(cur);
      cur = line;
    } else {
      cur = candidate;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/**
 * @param {string} method
 * @param {object|string} body
 * @param {{ contentType?: string, timeout?: number }} [opts]
 * @returns {{ ok: boolean, status: number, json: any }}
 */
function callApi(method, body, opts) {
  var token = getTgToken();
  if (!token) return { ok: false, status: 0, json: {} };
  var timeout = (opts && opts.timeout) || 8;
  var contentType = (opts && opts.contentType) || 'application/json';
  var isJson = contentType.indexOf('application/json') === 0;

  for (var attempt = 0; attempt < 2; attempt++) {
    var res;
    try {
      res = $http.send({
        method: 'POST',
        url: TG_API_BASE + token + '/' + method,
        headers: { 'Content-Type': contentType },
        body: isJson ? JSON.stringify(body) : body,
        timeout: timeout
      });
    } catch (err) {
      // err может содержать URL с токеном — логируем только метод.
      console.log('[tg] ' + method + ': network error');
      return { ok: false, status: 0, json: {} };
    }
    var json = parseJson(res);
    if (res.statusCode === 429 && attempt === 0) {
      var retry = Number(json && json.parameters && json.parameters.retry_after) || 1;
      if (retry > 5) retry = 5;
      sleep(retry * 1000);
      continue;
    }
    return { ok: res.statusCode < 300 && json.ok !== false, status: res.statusCode, json: json };
  }
  return { ok: false, status: 429, json: {} };
}

/**
 * 403 «bot was blocked by the user» / «user is deactivated» → пометить канал заблокированным.
 * 403 «can't initiate conversation» (пользователь ещё не нажимал /start) — НЕ блокировка.
 */
function handleSendFailure(tgId, method, result) {
  if (result.status === 403 && /blocked by the user|user is deactivated/i.test(describe(result.json))) {
    markTgBlocked(tgId, true);
    return;
  }
  if (result.status >= 300) {
    console.log('[tg] ' + method + ' ' + result.status + ': ' + describe(result.json));
  }
}

function isParseError(result) {
  return result.status === 400 && /parse entities|can't parse|unsupported start tag/i.test(describe(result.json));
}

/**
 * @param {string} tgId
 * @param {string} text MAX-markdown
 * @param {{ replyMarkup?: object }} [opts]
 * @returns {boolean}
 */
function sendTgMessage(tgId, text, opts) {
  var chatId = normalizeTgId(tgId);
  if (!chatId || !text || !isTgConfigured()) return false;
  var chunks = splitForTelegram(text, TG_TEXT_LIMIT);
  if (!chunks.length) return false;
  var anyOk = false;
  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i];
    var isLast = i === chunks.length - 1;
    var payload = {
      chat_id: chatId,
      text: maxMarkdownToTelegramHtml(chunk),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true }
    };
    if (isLast && opts && opts.replyMarkup) payload.reply_markup = opts.replyMarkup;

    var result = callApi('sendMessage', payload);
    if (!result.ok && isParseError(result)) {
      delete payload.parse_mode;
      payload.text = maxMarkdownToPlain(chunk);
      result = callApi('sendMessage', payload);
    }
    if (!result.ok) {
      handleSendFailure(chatId, 'sendMessage', result);
      if (!anyOk) return false;
      break;
    }
    anyOk = true;
  }
  return anyOk;
}

function pickLargestPhotoId(photoSizes) {
  if (!photoSizes || !photoSizes.length) return '';
  return String(photoSizes[photoSizes.length - 1].file_id || '');
}

/**
 * Медиа рассылки: читаем файлы с диска PB (поле protected → URL недоступен Telegram).
 * Возвращает объект-контекст рассылки; file_id кешируется после первого получателя.
 * @param {any} record scheduled_broadcasts
 * @returns {{ files: Array<{ filename: string, path: string }>, fileIds: Object<string,string> } | undefined}
 */
function prepareBroadcastMedia(record) {
  if (!record) return undefined;
  var mediaField = record.get('media');
  var filenames = mediaField ? (Array.isArray(mediaField) ? mediaField : [mediaField]) : [];
  var files = [];
  for (var i = 0; i < filenames.length && files.length < TG_MEDIA_GROUP_MAX; i++) {
    var filename = String(filenames[i] || '');
    if (!filename || filename.indexOf('/') !== -1 || filename.indexOf('\\') !== -1) continue;
    files.push({
      filename: filename,
      path: $filepath.join($app.dataDir(), 'storage', record.baseFilesPath(), filename)
    });
  }
  return files.length ? { files: files, fileIds: {} } : undefined;
}

function canUploadFiles() {
  return typeof $os !== 'undefined' && typeof $os.readFile === 'function';
}

/**
 * @param {string} chatId
 * @param {{ files: Array<{ filename: string, path: string }>, fileIds: Object<string,string> }} media
 * @param {string} captionHtml '' — без подписи
 * @returns {boolean}
 */
function sendTgPhotos(chatId, media, captionHtml) {
  var files = media.files;
  var i;

  if (files.length === 1) {
    var f = files[0];
    var cached = media.fileIds[f.filename];
    var result;
    if (cached) {
      var payload = { chat_id: chatId, photo: cached };
      if (captionHtml) {
        payload.caption = captionHtml;
        payload.parse_mode = 'HTML';
      }
      result = callApi('sendPhoto', payload);
    } else {
      if (!canUploadFiles()) return false;
      var bytes;
      try {
        bytes = $os.readFile(f.path);
      } catch (readErr) {
        console.log('[tg] read photo: ' + readErr);
        return false;
      }
      var parts = [{ name: 'chat_id', value: chatId }];
      if (captionHtml) {
        parts.push({ name: 'caption', value: captionHtml });
        parts.push({ name: 'parse_mode', value: 'HTML' });
      }
      parts.push({ name: 'photo', filename: f.filename, value: bytes, isFile: true });
      var mp = buildMultipart(parts);
      result = callApi('sendPhoto', mp.body, { contentType: mp.contentType, timeout: 60 });
      if (result.ok) {
        var id = pickLargestPhotoId(result.json.result && result.json.result.photo);
        if (id) media.fileIds[f.filename] = id;
      }
    }
    if (!result.ok) handleSendFailure(chatId, 'sendPhoto', result);
    return result.ok;
  }

  var allCached = true;
  for (i = 0; i < files.length; i++) {
    if (!media.fileIds[files[i].filename]) {
      allCached = false;
      break;
    }
  }

  var items = [];
  var formParts = [{ name: 'chat_id', value: chatId }];
  for (i = 0; i < files.length; i++) {
    var item = { type: 'photo' };
    var fid = media.fileIds[files[i].filename];
    if (fid) {
      item.media = fid;
    } else {
      if (!canUploadFiles()) return false;
      item.media = 'attach://file' + i;
      var fileBytes;
      try {
        fileBytes = $os.readFile(files[i].path);
      } catch (err2) {
        console.log('[tg] read photo: ' + err2);
        return false;
      }
      formParts.push({
        name: 'file' + i,
        filename: files[i].filename,
        value: fileBytes,
        isFile: true
      });
    }
    if (i === 0 && captionHtml) {
      item.caption = captionHtml;
      item.parse_mode = 'HTML';
    }
    items.push(item);
  }

  var groupResult;
  if (allCached) {
    groupResult = callApi('sendMediaGroup', { chat_id: chatId, media: items });
  } else {
    formParts.push({ name: 'media', value: JSON.stringify(items) });
    var mpg = buildMultipart(formParts);
    groupResult = callApi('sendMediaGroup', mpg.body, { contentType: mpg.contentType, timeout: 90 });
  }
  if (groupResult.ok) {
    var msgs = groupResult.json.result || [];
    for (i = 0; i < msgs.length && i < files.length; i++) {
      var pid = pickLargestPhotoId(msgs[i] && msgs[i].photo);
      if (pid) media.fileIds[files[i].filename] = pid;
    }
  } else {
    handleSendFailure(chatId, 'sendMediaGroup', groupResult);
  }
  return groupResult.ok;
}

/**
 * Сообщение с фото. Подпись > 1024 символов → фото без подписи + отдельный текст.
 * @param {string} tgId
 * @param {string} text MAX-markdown
 * @param {ReturnType<typeof prepareBroadcastMedia>} media
 */
function sendTgMessageWithMedia(tgId, text, media) {
  var chatId = normalizeTgId(tgId);
  if (!chatId || !isTgConfigured()) return false;
  if (!media || !media.files || !media.files.length) {
    return sendTgMessage(chatId, text);
  }
  var html = text ? maxMarkdownToTelegramHtml(text) : '';
  var fitsCaption = !!html && maxMarkdownToPlain(text).length <= TG_CAPTION_LIMIT;
  var photosOk = false;
  try {
    photosOk = sendTgPhotos(chatId, media, fitsCaption ? html : '');
  } catch (err) {
    console.log('[tg] photos: ' + err);
  }
  if (photosOk && (fitsCaption || !text)) return true;
  // Фото не ушли (или подпись не влезла) — текст отдельно.
  return text ? sendTgMessage(chatId, text) : photosOk;
}

/** Кнопка открытия Mini App (web_app) в приветствии. */
function buildOpenAppMarkup() {
  var url = String($os.getenv('TG_WEBAPP_URL') || '').trim();
  if (!/^https:\/\//i.test(url)) return undefined;
  return { inline_keyboard: [[{ text: 'Открыть', web_app: { url: url } }]] };
}

function sendWelcome(tgId, text) {
  if (!text) return false;
  return sendTgMessage(tgId, text, { replyMarkup: buildOpenAppMarkup() });
}

/**
 * Флаг блокировки Telegram-канала + пересчёт агрегата bot_blocked.
 * @param {string} tgId
 * @param {boolean} blocked
 */
function markTgBlocked(tgId, blocked) {
  var id = normalizeTgId(tgId);
  if (!id) return;
  var user;
  try {
    user = $app.findFirstRecordByFilter('users', 'tg_id = {:tgId}', { tgId: id });
  } catch (_) {
    return;
  }
  if (!user) return;
  if (user.getBool('tg_bot_blocked') === !!blocked) return;
  try {
    var bot = require(__hooks + '/botlib.js');
    user.set('tg_bot_blocked', !!blocked);
    user.set('tg_bot_blocked_at', blocked ? new Date().toISOString() : '');
    bot.recomputeBotBlocked(user);
    $app.save(user);
    console.log('[tg] tg_bot_blocked=' + !!blocked + ' user=' + user.id);
  } catch (err) {
    console.log('[tg] markTgBlocked: ' + err);
  }
}

module.exports = {
  isTgConfigured: isTgConfigured,
  normalizeTgId: normalizeTgId,
  maxMarkdownToTelegramHtml: maxMarkdownToTelegramHtml,
  sendTgMessage: sendTgMessage,
  sendTgMessageWithMedia: sendTgMessageWithMedia,
  prepareBroadcastMedia: prepareBroadcastMedia,
  sendWelcome: sendWelcome,
  markTgBlocked: markTgBlocked
};
