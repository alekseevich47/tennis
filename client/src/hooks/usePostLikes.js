// @ts-check
import { useCallback } from 'react';
import useSWR from 'swr';
import { listPostLikes, togglePostLike } from '../services/posts';
import { error } from '../lib/log';

/**
 * @param {string | null | undefined} postId
 */
export function usePostLikes(postId) {
  const { data, mutate, isLoading } = useSWR(
    postId ? ['post_likes', postId] : null,
    ([, id]) => listPostLikes(id)
  );

  const likes = data || [];

  const isLiked = useCallback(
    (userId) => Boolean(userId && likes.some((like) => like.user === userId)),
    [likes]
  );

  const toggle = useCallback(
    async (targetPostId, userId) => {
      if (!targetPostId || !userId) return;

      const alreadyLiked = likes.some((like) => like.user === userId);
      const optimisticLikes = alreadyLiked
        ? likes.filter((like) => like.user !== userId)
        : [
          ...likes,
          {
            id: `optimistic-${targetPostId}-${userId}`,
            post: targetPostId,
            user: userId,
            created: new Date().toISOString()
          }
        ];

      await mutate(optimisticLikes, { revalidate: false });

      try {
        await togglePostLike(targetPostId, userId);
        await mutate();
      } catch (err) {
        error('toggle post like:', err);
        await mutate();
      }
    },
    [likes, mutate]
  );

  return {
    likes,
    count: likes.length,
    isLiked,
    toggle,
    isLoading
  };
}
