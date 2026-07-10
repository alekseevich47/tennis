// @ts-check
import { formatDateTimeShort } from './format';
import { AUDIT_EVENT_CATEGORIES, AUDIT_OBJECT_TYPES } from '../services/auditLog';

/** @type {Record<string, { label: string, color: string }>} */
const CATEGORY_STYLES = Object.fromEntries(
  AUDIT_EVENT_CATEGORIES.map((item) => [
    item.value,
    {
      label: item.label,
      color:
        {
          feed: '#007aff',
          tournament_feed: '#5856d6',
          booking: '#34c759',
          shop: '#ff9500',
          gallery: '#af52de',
          profile: '#5ac8fa',
          subscription: '#00c7be',
          admin: '#ff3b30'
        }[item.value] || '#868e96'
    }
  ])
);

/** @type {Record<string, string>} */
const SUBJECT_SOURCE_LABELS = {
  self: 'сам',
  moderator: 'модератор',
  system: 'система'
};

/** @type {Record<string, string>} */
const OBJECT_TYPE_LABELS = Object.fromEntries(
  AUDIT_OBJECT_TYPES.map((item) => [item.value, item.label])
);

/**
 * @param {import('pocketbase').RecordModel} entry
 */
function resolveSubjectRole(entry) {
  const expanded = entry.expand?.subject_id;
  if (expanded?.role) return expanded.role;
  const label = entry.subject_label || '';
  const match = label.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : null;
}

/**
 * @param {unknown} value
 */
function formatDetailValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
export function formatAuditEventPreview(entry) {
  const style = CATEGORY_STYLES[entry.category] || { label: entry.category, color: '#868e96' };
  const subject = entry.subject_label || 'Система';
  const role = resolveSubjectRole(entry);
  const roleMark = role && role !== 'user' ? ` (${role})` : '';

  return {
    title: entry.summary_ru || entry.action || 'Событие',
    meta: `${formatDateTimeShort(entry.created)} · ${subject}${roleMark}`,
    color: style.color,
    categoryLabel: style.label
  };
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
function resolveProductArticle(entry) {
  const details = entry.details;
  if (details && typeof details === 'object' && details.article) {
    return `#${details.article}`;
  }
  if (entry.object_type === 'product' && entry.object_id) {
    return `#${entry.object_id}`;
  }
  return null;
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
function resolveTrainingId(entry) {
  if (entry.object_type !== 'training') return null;
  const details = entry.details;
  if (details && typeof details === 'object' && details.trainingId) {
    return String(details.trainingId);
  }
  return entry.object_id ? String(entry.object_id) : null;
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
export function formatAuditEventDetails(entry) {
  const role = resolveSubjectRole(entry);
  const objectTypeLabel = OBJECT_TYPE_LABELS[entry.object_type] || entry.object_type || '—';
  const subjectSource =
    SUBJECT_SOURCE_LABELS[entry.subject_source] || entry.subject_source || '—';
  const productArticle = resolveProductArticle(entry);
  const trainingId = resolveTrainingId(entry);

  /** @type {{ title: string, items: { label: string, value: string }[] }[]} */
  const sections = [
    {
      title: 'Кто',
      items: [
        { label: 'Субъект', value: entry.subject_label || 'Система' },
        { label: 'Роль', value: role || '—' },
        { label: 'Источник', value: subjectSource }
      ]
    },
    {
      title: 'Над чем / кем',
      items: [
        { label: 'Тип объекта', value: objectTypeLabel },
        { label: 'Объект', value: entry.object_label || entry.object_id || '—' },
        ...(productArticle ? [{ label: 'Артикул', value: productArticle }] : []),
        ...(trainingId ? [{ label: 'ID тренировки', value: trainingId }] : []),
        ...(entry.target_label
          ? [{ label: 'Цель', value: entry.target_label }]
          : [])
      ]
    },
    {
      title: 'Когда',
      items: [
        { label: 'Записано', value: formatDateTimeShort(entry.created) },
        ...(entry.effective_at && entry.effective_at !== entry.created
          ? [{ label: 'Эффективно', value: formatDateTimeShort(entry.effective_at) }]
          : [])
      ]
    }
  ];

  const diff = Array.isArray(entry.diff) ? entry.diff : [];
  if (diff.length > 0) {
    sections.push({
      title: 'Изменения',
      items: diff.map((change) => ({
        label: change.field,
        value: `${formatDetailValue(change.from)} → ${formatDetailValue(change.to)}`
      }))
    });
  }

  const details =
    entry.details && typeof entry.details === 'object' && Object.keys(entry.details).length > 0
      ? entry.details
      : null;

  return { sections, details };
}
