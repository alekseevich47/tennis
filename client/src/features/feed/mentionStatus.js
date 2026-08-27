// @ts-check
import pb from '../../services/pb';
import { isRatingVisible } from '../../lib/rating';
import { MENTION_CLASS } from './postMentions';

/** @type {Map<string, boolean>} */
const userMissingCache = new Map();
/** @type {Map<string, boolean>} */
const postMissingCache = new Map();
/** @type {Map<string, Promise<boolean>>} */
const userInflight = new Map();
/** @type {Map<string, Promise<boolean>>} */
const postInflight = new Map();

export const MENTION_MISSING_CLASS = 'post-mention--missing';

/**
 * @param {string} userId
 * @param {any[] | null | undefined} players
 * @returns {Promise<boolean>} true = missing / not in rating
 */
async function resolveUserMissing(userId, players) {
  if (!userId) return true;
  if (userMissingCache.has(userId)) return /** @type {boolean} */ (userMissingCache.get(userId));

  const cachedPlayer = (players || []).find((p) => p?.id === userId);
  if (cachedPlayer) {
    const missing = !isRatingVisible(cachedPlayer);
    userMissingCache.set(userId, missing);
    return missing;
  }

  if (userInflight.has(userId)) {
    return /** @type {Promise<boolean>} */ (userInflight.get(userId));
  }

  const promise = pb
    .collection('users')
    .getOne(userId, {
      fields: 'id,is_visible,is_banned,bot_blocked'
    })
    .then((user) => {
      const missing = !isRatingVisible(user);
      userMissingCache.set(userId, missing);
      return missing;
    })
    .catch(() => {
      userMissingCache.set(userId, true);
      return true;
    })
    .finally(() => {
      userInflight.delete(userId);
    });

  userInflight.set(userId, promise);
  return promise;
}

/**
 * @param {string} postId
 * @param {'feed' | 'tournament'} source
 * @returns {Promise<boolean>}
 */
async function resolvePostMissing(postId, source) {
  if (!postId) return true;
  const cacheKey = `${source}:${postId}`;
  if (postMissingCache.has(cacheKey)) {
    return /** @type {boolean} */ (postMissingCache.get(cacheKey));
  }

  if (postInflight.has(cacheKey)) {
    return /** @type {Promise<boolean>} */ (postInflight.get(cacheKey));
  }

  const collection = source === 'tournament' ? 'tournament_posts' : 'posts';
  const promise = pb
    .collection(collection)
    .getOne(postId, { fields: 'id,is_deleted' })
    .then((post) => {
      const missing = post?.is_deleted === true;
      postMissingCache.set(cacheKey, missing);
      return missing;
    })
    .catch(() => {
      postMissingCache.set(cacheKey, true);
      return true;
    })
    .finally(() => {
      postInflight.delete(cacheKey);
    });

  postInflight.set(cacheKey, promise);
  return promise;
}

/**
 * Помечает missing mention-чипы классом `.post-mention--missing`.
 * @param {HTMLElement | null | undefined} root
 * @param {{ players?: any[] | null }} [options]
 * @returns {Promise<void>}
 */
export async function applyMentionMissingStatuses(root, options = {}) {
  if (!root) return;
  const mentions = root.querySelectorAll(`.${MENTION_CLASS}`);
  if (!mentions.length) return;

  /** @type {Promise<void>[]} */
  const tasks = [];

  mentions.forEach((el) => {
    const kind = el.getAttribute('data-mention');
    if (kind === 'user') {
      const id = el.getAttribute('data-user-id') || '';
      tasks.push(
        resolveUserMissing(id, options.players).then((missing) => {
          el.classList.toggle(MENTION_MISSING_CLASS, missing);
        })
      );
      return;
    }
    if (kind === 'post') {
      const postId = el.getAttribute('data-post-id') || '';
      const sourceRaw = el.getAttribute('data-post-source') || 'feed';
      const source = sourceRaw === 'tournament' ? 'tournament' : 'feed';
      tasks.push(
        resolvePostMissing(postId, source).then((missing) => {
          el.classList.toggle(MENTION_MISSING_CLASS, missing);
        })
      );
    }
  });

  await Promise.all(tasks);
}
