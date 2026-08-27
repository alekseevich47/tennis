// Системные шаблоны bot/in-app. require() из хуков.
// resolve() → null если disabled; иначе объект с подставленными полями.

var DEFAULTS = [
  // --- bot ---
  {
    key: 'bot.user_registered',
    channel: 'bot',
    name: 'Регистрация участника',
    description: 'Модераторам при создании нового пользователя.',
    body: '*{{name}}* зарегистрировался в приложении {{time}}',
    audience: 'moderator',
    enabled: true
  },
  {
    key: 'bot.welcome',
    channel: 'bot',
    name: 'Приветствие в боте',
    description: 'Пользователю при старте бота (webhook bot_started).',
    body: 'Добро пожаловать в Секцию Миленьких! Для использования нашего приложения нажмите кнопку «Открыть»',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.new_publication',
    channel: 'bot',
    name: 'Новая публикация',
    description: 'Всем при публикации поста ленты или турнира.',
    body: 'Появилось что-то новенькое! Зайдите в приложение 🏓',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.training_reminder',
    channel: 'bot',
    name: 'Напоминание о тренировке (вечер)',
    description: 'Записанным на завтра (cron 20:00 GMT+7).',
    body: 'Напоминаем Вам, что вы записаны на *{{type}}* на *{{time}}*{{extra}}. Если у Вас изменились планы — пожалуйста, снимите запись и сообщите об этом тренеру.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.training_created',
    channel: 'bot',
    name: 'Новая тренировка в расписании',
    description: 'Всем при создании тренировки/турнира.',
    body: 'Уважаемые участники, в расписание {{added}} на *{{date}}*. Вы можете произвести запись в приложении.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.training_cancelled',
    channel: 'bot',
    name: 'Отмена тренировки',
    description: 'Всем при финализации отмены тренировки.',
    body: 'Уважаемые участники, {{type}} *{{date}}* по техническим причинам не состоится. Количество доступных посещений будет восстановлено.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.training_restored',
    channel: 'bot',
    name: 'Восстановление тренировки',
    description: 'Всем при восстановлении отменённой тренировки.',
    body: 'Уважаемые участники, запись на *{{type}}* *{{date}}* восстановлена.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.training_status',
    channel: 'bot',
    name: 'Закрытие/открытие записи',
    description: 'Всем при закрытии или открытии записи на тренировку.',
    body: 'Уважаемые участники, запись на {{type}} {{date}} {{status}}.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.membership_freeze',
    channel: 'bot',
    name: 'Заморозка абонемента',
    description: 'Участнику при заморозке абонемента модератором.',
    body: 'Ваш абонемент был заморожен на 1 месяц.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.membership_freeze_warn_user',
    channel: 'bot',
    name: 'Скоро конец заморозки (участник)',
    description: 'Участнику за 7 дней до автоснятия заморозки.',
    body: 'Действие заморозки Вашего абонемента заканчивается через 1 неделю!',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.membership_freeze_warn_mod',
    channel: 'bot',
    name: 'Скоро конец заморозки (модератор)',
    description: 'Модераторам за 7 дней до автоснятия заморозки участника.',
    body: '*{{name}}* действие заморозки абонемента заканчивается *{{date}}*',
    audience: 'moderator',
    enabled: true
  },
  {
    key: 'bot.membership_expiry_warn_user',
    channel: 'bot',
    name: 'Скоро конец абонемента (участник)',
    description: 'Участнику за 7 дней до окончания периода абонемента.',
    body: 'Действие Вашего абонемента закончится через 1 неделю. Позаботьтесь о своевременной оплате. А так мы всегда рядом с Вами!',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.membership_expiry_warn_mod',
    channel: 'bot',
    name: 'Скоро конец абонемента (модератор)',
    description: 'Модераторам за 7 дней до окончания абонемента участника.',
    body: '*{{name}}* действие абонемента заканчивается *{{date}}*',
    audience: 'moderator',
    enabled: true
  },
  {
    key: 'bot.membership_expired',
    channel: 'bot',
    name: 'Абонемент закончился',
    description: 'Участнику в день окончания абонемента в 08:00 GMT+7.',
    body: 'Действие Вашего абонемента закончилось сегодня.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'bot.membership_topup',
    channel: 'bot',
    name: 'Начисление посещений',
    description: 'Участнику при пополнении доступных посещений.',
    body: 'Вам было начислено *{{count}}* посещений. Мы будем очень рады Вас видеть!',
    audience: 'user',
    enabled: true
  },
  // --- app ---
  {
    key: 'app.training_countdown',
    channel: 'app',
    name: 'Напоминание о тренировке',
    description: 'In-app «Не забыли?» при записи / за 4 часа до старта.',
    title: 'Не забыли? 😜',
    body: 'А мы напоминаем, совсем скоро у Вас запланирована тренировка! Мы Вас будем ждать! Но если что-то пошло не по плану, обязательно сообщите нам.',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.training_farewell',
    channel: 'app',
    name: 'Отмена записи на тренировку',
    description: 'In-app при снятии записи / отмене тренировки.',
    title: 'Будем скучать! 💔',
    body: 'Ваша запись на тренировку отменена. Не переживайте, главное — не терять настрой! Надеемся на скорую встречу. Выберите удобное время для следующего занятия, как только будете готовы.',
    action_label: 'Очень жаль, что не увиделись 😢',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.training_completed',
    channel: 'app',
    name: 'Тренировка завершена',
    description: 'In-app после окончания тренировки.',
    title: 'Тренировка завершена! 🎉',
    body: 'Поздравляем с мощной тренировкой! Вы отлично потрудились и сделали еще один важный шаг к своей цели. Отдыхайте, восстанавливайте силы и гордитесь собой!',
    action_label: 'Отличная работа! 💪',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.sessions_left_3',
    channel: 'app',
    name: 'Осталось 3 посещения',
    description: 'In-app при списании до 3 посещений (обычный абонемент).',
    title: 'Движение — это жизнь 🏃‍♂️',
    body: 'У вас осталось всего 3 визита. Самое время закрепить результат и спланировать следующие тренировки, чтобы не терять форму!',
    action_label: 'Осталось 3 посещения!',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.sessions_left_2',
    channel: 'app',
    name: 'Осталось 2 посещения',
    description: 'In-app при списании до 2 посещений.',
    title: 'Мы ценим Ваше время 🙏🏼',
    body: 'В вашем распоряжении остается совсем немного. Продлите абонемент сейчас, чтобы не прерывать прогресс в последний момент.',
    action_label: 'Осталось 2 посещения!',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.sessions_left_1',
    channel: 'app',
    name: 'Осталось 1 посещение',
    description: 'In-app при списании до 1 посещения.',
    title: 'Скоро понадобится добавка! 🤏',
    body: 'Осталось всего ничего... Продлите абонемент заранее, чтобы не тратить время на формальности при следующем входе.',
    action_label: 'Осталось 1 посещение!',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.sessions_left_0',
    channel: 'app',
    name: 'Осталось 0 посещений',
    description: 'In-app когда доступные посещения закончились.',
    title: 'Я сейчас заплачу 😭',
    body: 'Они закончились! Но мы верим, что увидим Вас снова!',
    action_label: 'Осталось 0 посещений!',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.membership_expiry_warn',
    channel: 'app',
    name: 'Скоро конец абонемента',
    description: 'In-app за 7 дней до окончания периода абонемента.',
    title: 'Скоро ВСЁ 🙁',
    body: 'Действие Вашего абонемента закончится через 1 неделю. Позаботьтесь о своевременной оплате. А так мы всегда рядом с Вами!',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.membership_expired',
    channel: 'app',
    name: 'Абонемент закончился',
    description: 'In-app в день окончания абонемента; кнопка открывает чат с модератором.',
    title: 'Еще не всё потеряно!',
    body: 'Действие Вашего абонемента закончилось, но ведь это не беда! Вы всегда сможете продлить его!',
    action_label: 'Продлить абонемент',
    audience: 'user',
    enabled: true
  },
  {
    key: 'app.membership_topup',
    channel: 'app',
    name: 'Пополнение посещений',
    description: 'In-app при начислении доступных посещений.',
    title: 'Пополнение...😏',
    body: 'Вам было начислено {{count}} посещений. Мм, кажется, мы скоро Вас увидим! 🙏',
    audience: 'user',
    enabled: true
  }
];

function findDefault(key) {
  for (var i = 0; i < DEFAULTS.length; i++) {
    if (DEFAULTS[i].key === key) return DEFAULTS[i];
  }
  return null;
}

function interpolate(text, vars) {
  if (!text) return '';
  var out = String(text);
  if (!vars) return out;
  Object.keys(vars).forEach(function (k) {
    out = out.split('{{' + k + '}}').join(String(vars[k] == null ? '' : vars[k]));
  });
  return out;
}

function collectionExists(app) {
  try {
    app.findCollectionByNameOrId('system_message_templates');
    return true;
  } catch (_) {
    return false;
  }
}

function ensureSystemTemplates(app) {
  if (!collectionExists(app)) return;
  var col = app.findCollectionByNameOrId('system_message_templates');
  for (var i = 0; i < DEFAULTS.length; i++) {
    var d = DEFAULTS[i];
    var existing;
    try {
      existing = app.findFirstRecordByFilter(
        'system_message_templates',
        'key = "' + d.key + '"'
      );
    } catch (_) {
      existing = null;
    }
    if (existing) continue;
    var rec = new Record(col);
    rec.set('key', d.key);
    rec.set('channel', d.channel);
    rec.set('name', d.name);
    rec.set('description', d.description || '');
    rec.set('title', d.title || '');
    rec.set('body', d.body || '');
    rec.set('action_label', d.action_label || '');
    rec.set('audience', d.audience || 'user');
    rec.set('enabled', d.enabled !== false);
    app.save(rec);
  }
}

/**
 * @returns {{ enabled: boolean, title: string, body: string, action_label: string, name: string, description: string } | null}
 * null = отключено (не отправлять)
 */
function resolve(app, key, vars) {
  var def = findDefault(key);
  var title = def ? def.title || '' : '';
  var body = def ? def.body || '' : '';
  var actionLabel = def ? def.action_label || '' : '';
  var name = def ? def.name || key : key;
  var description = def ? def.description || '' : '';
  var enabled = true;

  if (collectionExists(app)) {
    try {
      var rec = app.findFirstRecordByFilter('system_message_templates', 'key = "' + key + '"');
      if (rec) {
        enabled = rec.getBool('enabled') !== false;
        if (!enabled) return null;
        title = rec.getString('title') || title;
        body = rec.getString('body') || body;
        actionLabel = rec.getString('action_label') || actionLabel;
        name = rec.getString('name') || name;
        description = rec.getString('description') || description;
      }
    } catch (_) {}
  }

  return {
    enabled: true,
    title: interpolate(title, vars),
    body: interpolate(body, vars),
    action_label: interpolate(actionLabel, vars),
    name: name,
    description: description
  };
}

function listByChannel(app, channel) {
  ensureSystemTemplates(app);
  var out = [];
  if (!collectionExists(app)) {
    for (var i = 0; i < DEFAULTS.length; i++) {
      if (DEFAULTS[i].channel === channel) out.push(Object.assign({}, DEFAULTS[i]));
    }
    return out;
  }
  var records = app.findRecordsByFilter(
    'system_message_templates',
    'channel = "' + channel + '"',
    'name',
    0,
    0
  );
  for (var j = 0; j < records.length; j++) {
    var r = records[j];
    out.push({
      id: r.id,
      key: r.getString('key'),
      channel: r.getString('channel'),
      name: r.getString('name'),
      description: r.getString('description'),
      title: r.getString('title'),
      body: r.getString('body'),
      action_label: r.getString('action_label'),
      audience: r.getString('audience'),
      enabled: r.getBool('enabled') !== false
    });
  }
  return out;
}

module.exports = {
  DEFAULTS: DEFAULTS,
  ensureSystemTemplates: ensureSystemTemplates,
  resolve: resolve,
  listByChannel: listByChannel,
  interpolate: interpolate
};
