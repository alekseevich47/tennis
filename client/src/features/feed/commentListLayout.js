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

export function groupItemsByDay(items, getCreated) {
  const currentYear = new Date().getFullYear();
  /** @type {Array<{ dayKey: string, dateLabel: string, items: T[] }>} */
  const groups = [];

  for (const item of items) {
    const created = getCreated(item);
    const day = created ? dayKey(created) : '';
    const last = groups[groups.length - 1];

    if (!last || last.dayKey !== day) {
      groups.push({
        dayKey: day || `unknown-${groups.length}`,
        dateLabel: created ? formatCommentDaySeparator(created, currentYear) : '',
        items: [item]
      });
    } else {
      last.items.push(item);
    }
  }

  return groups;
}

/**
 * @template T
 * @param {T[]} comments
 */
export function groupCommentsByDay(comments) {
  return groupItemsByDay(comments, (comment) => comment?.created);
}

/**
 * @template T
 * @param {T[]} posts
 */
export function groupPostsByDay(posts) {
  return groupItemsByDay(posts, (post) => post?.created);
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
