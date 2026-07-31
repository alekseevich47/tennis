// @ts-check
import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { listCommentLikes, toggleCommentLike } from '../services/posts';
import { error } from '../lib/log';

/**
 * @param {string[]} commentIds
 * @param {'comments' | 'tournament_comments' | 'gallery_comments'} collection
 * @param {string | null | undefined} userId
 */
export function useCommentLikes(commentIds, collection, userId) {
  const cacheKey = commentIds.length
    ? ['comment_likes', collection, [...commentIds].sort().join(',')]
    : null;

  const { data: likes = [], mutate } = useSWR(
    cacheKey,
    () => listCommentLikes(commentIds, collection)
  );

  const countsByComment = useMemo(() => {
    /** @type {Record<string, number>} */
    const map = {};
    likes.forEach((like) => {
      map[like.comment] = (map[like.comment] || 0) + 1;
    });
    return map;
  }, [likes]);

  const userLikedSet = useMemo(() => {
    if (!userId) return new Set();
    return new Set(
      likes.filter((like) => like.author === userId).map((like) => like.comment)
    );
  }, [likes, userId]);

  const toggle = useCallback(
    async (commentId) => {
      if (!commentId || !userId) return;

      const alreadyLiked = likes.some(
        (like) => like.comment === commentId && like.author === userId
      );
      const optimisticLikes = alreadyLiked
        ? likes.filter((like) => !(like.comment === commentId && like.author === userId))
        : [
            ...likes,
            {
              id: `optimistic-${commentId}-${userId}`,
              comment: commentId,
              comment_collection: collection,
              author: userId,
              created: new Date().toISOString()
            }
          ];

      await mutate(optimisticLikes, { revalidate: false });

      try {
        await toggleCommentLike(commentId, collection, userId);
        mutate();
      } catch (err) {
        error('toggle comment like:', err);
        await mutate();
      }
    },
    [likes, userId, collection, mutate]
  );

  return { countsByComment, userLikedSet, mutateLikes: mutate, toggle };
}
