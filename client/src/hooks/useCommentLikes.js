// @ts-check
import { useMemo } from 'react';
import useSWR from 'swr';
import { listCommentLikes } from '../services/posts';

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

  return { countsByComment, userLikedSet, mutateLikes: mutate };
}
