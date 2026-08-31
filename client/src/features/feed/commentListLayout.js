import { dayKey, formatCommentDaySeparator } from '../../lib/format';

/**
 * Добавляет флаги разделителя дня для списка комментариев.
 * @template T
 * @param {T[]} comments
 * @returns {Array<{ comment: T, showDateSeparator: boolean, dateLabel: string | null }>}
 */
export function mapCommentsWithDaySeparators(comments) {
  const currentYear = new Date().getFullYear();
  let lastDayKey = null;

  return comments.map((comment) => {
    const created = comment?.created;
    const key = created ? dayKey(created) : null;
    const showDateSeparator = Boolean(key && key !== lastDayKey);
    if (key) lastDayKey = key;

    return {
      comment,
      showDateSeparator,
      dateLabel: showDateSeparator && created
        ? formatCommentDaySeparator(created, currentYear)
        : null
    };
  });
}
