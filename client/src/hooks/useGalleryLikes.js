// @ts-check
import { useCallback } from 'react';
import useSWR from 'swr';
import { listGalleryLikes, toggleGalleryLike } from '../services/catalog';
import { error } from '../lib/log';

/**
 * @param {string | null | undefined} mediaId
 */
export function useGalleryLikes(mediaId) {
  const { data, mutate, isLoading } = useSWR(
    mediaId ? ['gallery_likes', mediaId] : null,
    ([, id]) => listGalleryLikes(id)
  );

  const likes = data || [];

  const isLiked = useCallback(
    (userId) => Boolean(userId && likes.some((like) => like.user === userId)),
    [likes]
  );

  const toggle = useCallback(
    async (targetMediaId, userId) => {
      if (!targetMediaId || !userId) return;

      const alreadyLiked = likes.some((like) => like.user === userId);
      const optimisticLikes = alreadyLiked
        ? likes.filter((like) => like.user !== userId)
        : [
          ...likes,
          {
            id: `optimistic-${targetMediaId}-${userId}`,
            media_id: targetMediaId,
            user: userId,
            created: new Date().toISOString()
          }
        ];

      await mutate(optimisticLikes, { revalidate: false });

      try {
        await toggleGalleryLike(targetMediaId, userId);
        await mutate();
      } catch (err) {
        error('toggle gallery like:', err);
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
