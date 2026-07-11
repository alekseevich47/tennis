// @ts-check
import pb from './pb';

/** @typedef {{ start: string, end: string }} AuditDateRange */

/** @typedef {{
 *   page?: number,
 *   perPage?: number,
 *   categories?: string[],
 *   dateRange?: AuditDateRange | null,
 *   objectType?: string | null,
 *   objectId?: string | null,
 *   subjectId?: string | null,
 *   search?: string
 * }} AuditEventsFilters */

export const AUDIT_EVENT_CATEGORIES = [
  { value: 'feed', label: 'Лента' },
  { value: 'tournament_feed', label: 'Турнир' },
  { value: 'booking', label: 'Запись' },
  { value: 'shop', label: 'Магазин' },
  { value: 'gallery', label: 'Галерея' },
  { value: 'profile', label: 'Профиль' },
  { value: 'subscription', label: 'Абонемент' },
  { value: 'admin', label: 'Админ-панель' }
];

export const AUDIT_OBJECT_TYPES = [
  { value: 'post', label: 'Пост' },
  { value: 'comment', label: 'Комментарий (лента)' },
  { value: 'training', label: 'Тренировка' },
  { value: 'product', label: 'Товар' },
  { value: 'tournament_post', label: 'Турнирный пост' },
  { value: 'tournament_comment', label: 'Комментарий (турнир)' },
  { value: 'gallery_item', label: 'Медиа' },
  { value: 'gallery_comment', label: 'Комментарий (галерея)' },
  { value: 'user', label: 'Пользователь' },
  { value: 'scheduled_broadcast', label: 'Рассылка' },
  { value: 'scheduled_notification', label: 'Уведомление' },
  { value: 'notification_setting', label: 'Настройка уведомлений' }
];

const CSV_COLUMNS = [
  'category',
  'action',
  'summary_ru',
  'subject_label',
  'object_label',
  'target_label',
  'created'
];

/**
 * @param {string} value
 * @param {number} days
 */
function addDaysToDateInput(value, days) {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {AuditEventsFilters} filters
 */
function buildAuditEventsFilter(filters) {
  const { categories, dateRange, objectType, objectId, subjectId, search } = filters;
  const parts = [];
  /** @type {Record<string, string>} */
  const params = {};

  if (dateRange?.start && dateRange?.end) {
    parts.push('created >= {:start} && created < {:endExclusive}');
    params.start = dateRange.start;
    params.endExclusive = addDaysToDateInput(dateRange.end, 1);
  }

  if (categories && categories.length > 0) {
    const categoryParts = categories.map((category, index) => {
      const key = `category${index}`;
      params[key] = category;
      return `category = {:${key}}`;
    });
    parts.push(`(${categoryParts.join(' || ')})`);
  }

  if (objectType) {
    parts.push('object_type = {:objectType}');
    params.objectType = objectType;
  }

  if (objectId) {
    parts.push('object_id = {:objectId}');
    params.objectId = objectId;
  }

  if (subjectId) {
    parts.push('subject_id = {:subjectId}');
    params.subjectId = subjectId;
  }

  const query = search?.trim();
  if (query) {
    parts.push(
      '(summary_ru ~ {:q} || subject_label ~ {:q} || object_label ~ {:q} || target_label ~ {:q} || object_id ~ {:q})'
    );
    params.q = query;
  }

  if (parts.length === 0) return '';
  return pb.filter(parts.join(' && '), params);
}

/**
 * @param {AuditEventsFilters} filters
 */
export async function listAuditEvents({
  page = 1,
  perPage = 30,
  categories,
  dateRange,
  objectType,
  objectId,
  subjectId,
  search
} = {}) {
  const filter = buildAuditEventsFilter({
    categories,
    dateRange,
    objectType,
    objectId,
    subjectId,
    search
  });

  const result = await pb.collection('audit_events').getList(page, perPage, {
    ...(filter ? { filter } : {}),
    sort: '-created',
    expand: 'subject_id,target_id'
  });

  return {
    items: result.items,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    page: result.page,
    perPage: result.perPage
  };
}

/**
 * @param {unknown} value
 */
function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[;"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
function auditEventToCsvRow(entry) {
  return CSV_COLUMNS.map((column) => escapeCsvCell(entry[column])).join(';');
}

/**
 * @param {AuditEventsFilters} filters
 */
export async function exportAuditEvents(filters = {}) {
  const filter = buildAuditEventsFilter(filters);
  const items = await pb.collection('audit_events').getFullList({
    ...(filter ? { filter } : {}),
    sort: '-created'
  });

  const lines = [CSV_COLUMNS.join(';')];
  items.forEach((entry) => {
    lines.push(auditEventToCsvRow(entry));
  });

  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `audit-events-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
