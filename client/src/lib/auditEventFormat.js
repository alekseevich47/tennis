// @ts-check
import { formatDateTimeShort } from './format';
import { AUDIT_EVENT_CATEGORIES, AUDIT_OBJECT_TYPES } from '../services/auditLog';
import { htmlToReadableText, looksLikeRichHtml } from '../features/feed/postRichText';

/** @type {Record<string, { label: string, color: string }>} */
const CATEGORY_STYLES = Object.fromEntries(
  AUDIT_EVENT_CATEGORIES.map((item) => [
    item.value,
    {
      label: item.label,
      color: item.color || '#868e96'
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

/** @type {Record<string, string>} */
const COMMENT_TYPE_LABELS = {
  comment: 'Комментарий (лента)',
  gallery_comment: 'Комментарий (галерея)',
  tournament_comment: 'Комментарий (турнир)'
};

/** @type {Record<string, string>} */
const COMMENT_SECTION_LABELS = {
  comment: 'Лента',
  gallery_comment: 'Галерея',
  tournament_comment: 'Турнир'
};

const COMMENT_OBJECT_TYPES = ['comment', 'tournament_comment', 'gallery_comment'];

/**
 * @typedef {{ label: string, value: string, copyValue?: string }} AuditDetailItem
 */

/**
 * @param {string | null | undefined} label
 */
function stripRoleFromLabel(label) {
  if (!label) return 'Система';
  const match = label.match(/^(.+?)\s+\([^)]+\)\s*$/);
  return match ? match[1] : label;
}

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
 * @param {import('pocketbase').RecordModel} entry
 */
function resolveSubjectName(entry) {
  const expanded = entry.expand?.subject_id;
  if (expanded?.full_name) return String(expanded.full_name);
  return stripRoleFromLabel(entry.subject_label || 'Система');
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
function resolveSubjectId(entry) {
  if (entry.subject_id) return String(entry.subject_id);
  if (entry.expand?.subject_id?.id) return String(entry.expand.subject_id.id);
  return null;
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
  const str = String(value);
  if (looksLikeRichHtml(str) || /<\/?[a-z][\s\S]*>/i.test(str)) {
    return htmlToReadableText(str);
  }
  return str;
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
export function formatAuditEventPreview(entry) {
  const style = CATEGORY_STYLES[entry.category] || { label: entry.category, color: '#868e96' };
  const subject = resolveSubjectName(entry);
  const rawTitle = entry.summary_ru || entry.action || 'Событие';

  return {
    title: htmlToReadableText(String(rawTitle)),
    meta: `${formatDateTimeShort(entry.created)} · ${subject}`,
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
function resolveCommentMeta(entry) {
  if (!COMMENT_OBJECT_TYPES.includes(entry.object_type)) return null;

  const details = entry.details;
  const sectionLabel = COMMENT_SECTION_LABELS[entry.object_type] || '';
  const publicationLabel = entry.object_label && sectionLabel
    ? `${entry.object_label} (${sectionLabel})`
    : entry.object_label
      ? String(entry.object_label)
      : null;

  /** @type {string | null} */
  let publicationId = null;
  if (details && typeof details === 'object') {
    if (details.mediaId) publicationId = String(details.mediaId);
    else if (details.postId) publicationId = String(details.postId);
  }

  if (!details || typeof details !== 'object') {
    return entry.object_id
      ? {
          commentId: String(entry.object_id),
          publicationLabel,
          publicationId,
          text: null,
          authorName: null,
          authorId: null
        }
      : null;
  }

  return {
    commentId: details.commentId ? String(details.commentId) : entry.object_id ? String(entry.object_id) : null,
    publicationLabel,
    publicationId,
    text: details.text != null ? htmlToReadableText(String(details.text)) : null,
    authorName: details.authorName ? String(details.authorName) : null,
    authorId: details.authorId ? String(details.authorId) : null
  };
}

/**
 * @param {import('pocketbase').RecordModel} entry
 */
export function formatAuditEventDetails(entry) {
  const role = resolveSubjectRole(entry);
  const commentMeta = resolveCommentMeta(entry);
  const isComment = commentMeta != null;
  const objectTypeLabel = isComment
    ? (COMMENT_TYPE_LABELS[entry.object_type] || entry.object_type || '—')
    : (OBJECT_TYPE_LABELS[entry.object_type] || entry.object_type || '—');
  const subjectSource =
    SUBJECT_SOURCE_LABELS[entry.subject_source] || entry.subject_source || '—';
  const productArticle = resolveProductArticle(entry);
  const trainingId = resolveTrainingId(entry);
  const subjectName = resolveSubjectName(entry);
  const subjectId = resolveSubjectId(entry);

  /** @type {{ title: string, items: AuditDetailItem[] }[]} */
  const sections = [
    {
      title: 'Кто',
      items: [
        {
          label: 'Субъект',
          value: subjectName,
          ...(subjectName !== 'Система' ? { copyValue: subjectName } : {})
        },
        ...(subjectId
          ? [{ label: 'ID субъекта', value: subjectId, copyValue: subjectId }]
          : []),
        { label: 'Роль', value: role || '—' },
        { label: 'Источник', value: subjectSource }
      ]
    },
    {
      title: 'Над чем / кем',
      items: [
        { label: 'Тип объекта', value: objectTypeLabel },
        ...(!isComment
          ? [{ label: 'Объект', value: entry.object_label || entry.object_id || '—' }]
          : []),
        ...(productArticle ? [{ label: 'Артикул', value: productArticle }] : []),
        ...(trainingId ? [{ label: 'ID тренировки', value: trainingId }] : []),
        ...(commentMeta?.commentId
          ? [{ label: 'ID объекта', value: commentMeta.commentId, copyValue: commentMeta.commentId }]
          : []),
        ...(commentMeta?.publicationLabel
          ? [{ label: 'Публикация', value: commentMeta.publicationLabel }]
          : []),
        ...(commentMeta?.publicationId
          ? [{ label: 'ID публикации', value: commentMeta.publicationId, copyValue: commentMeta.publicationId }]
          : []),
        ...(commentMeta?.text ? [{ label: 'Текст комментария', value: commentMeta.text }] : []),
        ...(commentMeta?.authorName
          ? [{ label: 'Автор комментария', value: commentMeta.authorName }]
          : []),
        ...(commentMeta?.authorId
          ? [{ label: 'ID автора', value: commentMeta.authorId, copyValue: commentMeta.authorId }]
          : []),
        ...(!isComment && entry.target_label
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
