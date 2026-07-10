// @ts-check
import { formatCardDate, formatDateTimeShort, formatPostDate, pluralize } from './format';

/** Синхронизировать с SETTINGS_ROWS в NotificationSettingsModal.jsx */
const NOTIFICATION_SETTING_LABELS = {
  training_reminder_enabled: 'Напоминание о тренировках',
  training_created_enabled: 'Создание тренировки',
  training_edited_enabled: 'Изменение тренировки',
  training_deleted_enabled: 'Отмена тренировки',
  training_booking_enabled: 'Запись участников',
  comments_notification_enabled: 'Уведомления о комментариях',
  posts_created_enabled: 'Создание постов (лента)',
  tournament_posts_created_enabled: 'Создание постов (турнир)'
};

const TRAINING_FIELD_LABELS = {
  date: 'дата',
  location: 'место',
  type: 'тип',
  duration: 'длительность',
  max_slots: 'мест',
  description: 'описание',
  booked_users: 'участники',
  status: 'статус',
  is_cancelled: 'отмена'
};

const MEMBERSHIP_FIELD_LABELS = {
  membership_type: 'тип абонемента',
  membership_start_date: 'начало периода',
  membership_end_date: 'окончание периода',
  available_sessions: 'посещения',
  membership_comment: 'комментарий'
};

const MEMBERSHIP_TYPE_LABELS = {
  regular: 'Обычный',
  corporate: 'Корпоративный',
  annual: 'Годовой'
};

const PROFILE_FIELD_LABELS = {
  full_name: 'имя',
  email: 'email',
  phone: 'телефон',
  bio: 'о себе',
  avatar: 'аватар',
  avatar_url: 'аватар'
};

const ADMIN_CHANGED_FIELD_LABELS = {
  text: 'текст',
  title: 'заголовок',
  body: 'текст',
  audience: 'аудитория',
  recipients: 'получатели',
  scheduled_at: 'время отправки',
  media: 'медиа'
};

const AUDIENCE_LABELS = {
  all: 'Все',
  all_except_banned: 'Все, кроме заблокированных',
  selected: 'Выбранные'
};

const TRAINING_TYPE_LABELS = {
  group: 'Тренировка',
  tournament: 'Турнир'
};

/**
 * @param {unknown} id
 */
function shortenId(id) {
  const value = String(id || '');
  if (!value) return 'пользователь';
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

/**
 * @param {unknown} value
 */
function isDateLike(value) {
  if (!value) return false;
  const time = new Date(String(value)).getTime();
  return Number.isFinite(time);
}

/**
 * @param {string} field
 * @param {unknown} value
 */
function formatFieldValue(field, value) {
  if (value == null || value === '') return '—';

  if (field === 'date' || field === 'scheduled_at' || field.endsWith('_at') || field.endsWith('_date')) {
    return isDateLike(value) ? formatPostDate(value) : String(value);
  }

  if (field === 'type' && typeof value === 'string' && TRAINING_TYPE_LABELS[value]) {
    return TRAINING_TYPE_LABELS[value];
  }

  if (field === 'membership_type' && typeof value === 'string' && MEMBERSHIP_TYPE_LABELS[value]) {
    return MEMBERSHIP_TYPE_LABELS[value];
  }

  if (field === 'audience' && typeof value === 'string' && AUDIENCE_LABELS[value]) {
    return AUDIENCE_LABELS[value];
  }

  if (typeof value === 'boolean') {
    return value ? 'да' : 'нет';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return `${value.length} ${pluralize(value.length, 'элемент', 'элемента', 'элементов')}`;
  }

  return String(value);
}

/**
 * @param {Record<string, string>} labels
 * @param {string} field
 */
function getFieldLabel(labels, field) {
  return labels[field] || field.replace(/_/g, ' ');
}

/**
 * @param {Array<{ field?: string, from?: unknown, to?: unknown, removedUsers?: Array<{ fullName?: string }> }>} changedFields
 * @param {Record<string, string>} labels
 */
function formatDiffChangedFields(changedFields, labels) {
  if (!Array.isArray(changedFields) || changedFields.length === 0) return '';

  return changedFields
    .map((item) => {
      const field = item.field || '';
      const label = getFieldLabel(labels, field);

      if (Array.isArray(item.removedUsers) && item.removedUsers.length > 0) {
        const names = item.removedUsers
          .map((user) => user.fullName)
          .filter(Boolean)
          .join(', ');
        return names ? `${label}: ${names}` : label;
      }

      if (Object.prototype.hasOwnProperty.call(item, 'from') || Object.prototype.hasOwnProperty.call(item, 'to')) {
        return `${label}: ${formatFieldValue(field, item.from)} → ${formatFieldValue(field, item.to)}`;
      }

      return label;
    })
    .join(', ');
}

/**
 * @param {string[]} changedFields
 * @param {Record<string, string>} labels
 */
function formatKeyList(changedFields, labels) {
  if (!Array.isArray(changedFields) || changedFields.length === 0) return '';
  return changedFields.map((field) => getFieldLabel(labels, field)).join(', ');
}

/**
 * @param {{ date?: unknown, location?: unknown }} details
 */
function formatTrainingContext(details) {
  const parts = [];

  if (details.date) {
    parts.push(formatCardDate(details.date));
  }

  if (details.location) {
    parts.push(String(details.location));
  }

  return parts.join(', ');
}

/**
 * @param {string} audience
 * @param {number} [recipientsCount]
 * @param {boolean} [sendNow]
 * @param {unknown} [scheduledAt]
 */
function formatAudienceSchedule(audience, recipientsCount, sendNow, scheduledAt) {
  const parts = [];

  if (audience) {
    const audienceLabel = AUDIENCE_LABELS[audience] || audience;
    if (audience === 'selected' && recipientsCount != null) {
      parts.push(`${audienceLabel} (${recipientsCount})`);
    } else {
      parts.push(audienceLabel);
    }
  }

  if (sendNow) {
    parts.push('сразу');
  } else if (scheduledAt) {
    parts.push(formatPostDate(scheduledAt));
  }

  return parts.join(', ');
}

/**
 * @param {string | undefined} targetUserName
 * @param {unknown} targetUserId
 */
function formatTargetUser(targetUserName, targetUserId) {
  if (targetUserName) return String(targetUserName);
  return shortenId(targetUserId);
}

/**
 * @param {{ domain?: string, action?: string, details?: Record<string, unknown> }} entry
 */
function formatActionDetails(entry) {
  const details = /** @type {Record<string, unknown>} */ (entry.details || {});
  const domain = entry.domain || '';
  const action = entry.action || '';

  if (domain === 'ТРЕНИРОВКИ') {
    switch (action) {
      case 'Тренировка создана':
      case 'Тренировка скрыта':
      case 'Отмена тренировки финализирована':
      case 'Тренировка закрыта':
      case 'Тренировка открыта':
        return formatTrainingContext(details);

      case 'Тренировка восстановлена': {
        const context = formatTrainingContext(details);
        const insufficient = Array.isArray(details.insufficientUserIds)
          ? details.insufficientUserIds.length
          : 0;
        if (insufficient > 0) {
          const suffix = `недостаточно посещений у ${insufficient} ${pluralize(insufficient, 'игрока', 'игроков', 'игроков')}`;
          return context ? `${context} (${suffix})` : suffix;
        }
        return context;
      }

      case 'Тренировка отредактирована':
        return formatDiffChangedFields(
          /** @type {Array<{ field?: string, from?: unknown, to?: unknown }>} */ (details.changedFields),
          TRAINING_FIELD_LABELS
        );

      case 'Запись на тренировку': {
        const context = formatTrainingContext(details);
        const slots =
          details.maxSlots != null
            ? `, ${details.slotsUsed ?? '?'}/${details.maxSlots} мест`
            : '';
        return context ? `${context}${slots}` : slots.slice(2);
      }

      case 'Отмена записи':
        return formatTrainingContext(details);

      case 'Модератор записал игрока': {
        const user = formatTargetUser(
          /** @type {string | undefined} */ (details.targetUserName),
          details.targetUserId
        );
        const context = formatTrainingContext(details);
        return context ? `${user} — ${context}` : user;
      }

      case 'Модератор записал нескольких': {
        const names = Array.isArray(details.targetUserNames)
          ? details.targetUserNames.filter(Boolean).join(', ')
          : '';
        const context = formatTrainingContext(details);
        if (names && context) return `${names} — ${context}`;
        if (names) return names;
        if (details.addedCount != null) {
          const count = Number(details.addedCount);
          return `${count} ${pluralize(count, 'игрок', 'игрока', 'игроков')}${context ? ` — ${context}` : ''}`;
        }
        return context;
      }

      case 'Модератор удалил нескольких': {
        const removed = formatDiffChangedFields(
          /** @type {Array<{ field?: string, removedUsers?: Array<{ fullName?: string }> }>} */ (
            details.changedFields
          ),
          TRAINING_FIELD_LABELS
        );
        const context = formatTrainingContext(details);
        if (removed && context) return `${removed} — ${context}`;
        if (removed) return removed;
        if (Array.isArray(details.targetUserNames)) {
          const names = details.targetUserNames.filter(Boolean).join(', ');
          return context ? `${names} — ${context}` : names;
        }
        return context;
      }

      case 'Отмечена явка':
      case 'Явка отменена': {
        const user = formatTargetUser(
          /** @type {string | undefined} */ (details.targetUserName),
          details.targetUserId
        );
        const context = details.date ? formatCardDate(details.date) : '';
        return context ? `${user} — ${context}` : user;
      }

      default:
        return formatTrainingContext(details);
    }
  }

  if (domain === 'АБОНЕМЕНТ') {
    switch (action) {
      case 'Добавлены посещения':
        return `+${details.addedAmount ?? '?'}, итог ${details.newAvailableSessions ?? '?'}`;

      case 'Уменьшены посещения':
        return `−${details.subtractedAmount ?? '?'}, итог ${details.newAvailableSessions ?? '?'}`;

      case 'Изменён тип абонемента':
        return `${formatFieldValue('membership_type', details.from)} → ${formatFieldValue('membership_type', details.to)}`;

      case 'Абонемент разморожен':
        if (details.extendedDays != null) {
          const days = Number(details.extendedDays);
          return `срок продлён на ${days} ${pluralize(days, 'день', 'дня', 'дней')}`;
        }
        return '';

      case 'Абонемент отредактирован':
        return formatKeyList(
          /** @type {string[]} */ (details.changedFields),
          MEMBERSHIP_FIELD_LABELS
        );

      default:
        return '';
    }
  }

  if (domain === 'ПРОФИЛЬ') {
    switch (action) {
      case 'Профиль отредактирован':
        return formatKeyList(
          /** @type {string[]} */ (details.changedFields),
          PROFILE_FIELD_LABELS
        );

      case 'Пользователь заблокирован':
      case 'Комментарии ограничены':
        return details.reason ? String(details.reason) : '';

      default:
        return '';
    }
  }

  if (domain === 'РЕЙТИНГ') {
    if (action === 'Игрок добавлен вручную') {
      const parts = [];
      if (details.fullName) parts.push(String(details.fullName));
      if (details.ratingPoints != null) parts.push(`${details.ratingPoints} очков`);
      if (details.wins != null) {
        const wins = Number(details.wins);
        parts.push(`${wins} ${pluralize(wins, 'победа', 'победы', 'побед')}`);
      }
      return parts.join(', ');
    }
    return '';
  }

  if (domain === 'АДМИНИСТРИРОВАНИЕ') {
    switch (action) {
      case 'Рассылка создана':
        return formatAudienceSchedule(
          /** @type {string} */ (details.audience),
          /** @type {number | undefined} */ (details.recipientsCount),
          /** @type {boolean | undefined} */ (details.sendNow),
          details.scheduledAt
        );

      case 'Рассылка изменена':
        return formatKeyList(
          /** @type {string[]} */ (details.changedFields),
          ADMIN_CHANGED_FIELD_LABELS
        );

      case 'Уведомление создано': {
        const parts = [];
        if (details.title) parts.push(String(details.title));
        const schedule = formatAudienceSchedule(
          /** @type {string} */ (details.audience),
          /** @type {number | undefined} */ (details.recipientsCount),
          /** @type {boolean | undefined} */ (details.sendNow),
          details.scheduledAt
        );
        if (schedule) parts.push(schedule);
        return parts.join(' — ');
      }

      case 'Уведомление изменено':
        return formatKeyList(
          /** @type {string[]} */ (details.changedFields),
          ADMIN_CHANGED_FIELD_LABELS
        );

      case 'Настройка уведомлений изменена': {
        const field = String(details.field || '');
        const label = NOTIFICATION_SETTING_LABELS[field] || field;
        const state = details.value ? 'включено' : 'выключено';
        return `${label}: ${state}`;
      }

      default:
        return '';
    }
  }

  return '';
}

/**
 * @param {{ created?: string, actor_name?: string, actor_role?: string, action?: string, domain?: string, details?: Record<string, unknown> }} entry
 */
export function formatModeratorLogEntry(entry) {
  const actor = entry.actor_name || 'Неизвестный';
  const moderatorMark = entry.actor_role === 'МОДЕРАТОР' ? ' (модератор)' : '';
  const meta = `${formatDateTimeShort(entry.created)} · ${actor}${moderatorMark}`;

  const details = formatActionDetails(entry);
  const title = details ? `${entry.action} — ${details}` : (entry.action || '');

  return { title, meta };
}
