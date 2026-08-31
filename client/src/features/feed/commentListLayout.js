import { dayKey, formatCommentDaySeparator } from '../../lib/format';

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string | number | Date | undefined | null} getCreated
 */
export function mapItemsWithDaySeparators(items, getCreated) {
  const currentYear = new Date().getFullYear();
  let lastDayKey = null;

  return items.map((item) => {
    const created = getCreated(item);
    const key = created ? dayKey(created) : null;
    const showDateSeparator = Boolean(key && key !== lastDayKey);
    if (key) lastDayKey = key;

    return {
      item,
      showDateSeparator,
      dateLabel: showDateSeparator && created
        ? formatCommentDaySeparator(created, currentYear)
        : null
    };
  });
}

/**
 * Добавляет флаги разделителя дня для списка комментариев.
 * @template T
 * @param {T[]} comments
 * @returns {Array<{ comment: T, showDateSeparator: boolean, dateLabel: string | null }>}
 */
export function mapCommentsWithDaySeparators(comments) {
  return mapItemsWithDaySeparators(comments, (comment) => comment?.created).map(
    ({ item, showDateSeparator, dateLabel }) => ({
      comment: item,
      showDateSeparator,
      dateLabel
    })
  );
}

/**
 * @template T
 * @param {T[]} posts
 */
export function mapPostsWithDaySeparators(posts) {
  return mapItemsWithDaySeparators(posts, (post) => post?.created).map(
    ({ item, showDateSeparator, dateLabel }) => ({
      post: item,
      showDateSeparator,
      dateLabel
    })
  );
}
