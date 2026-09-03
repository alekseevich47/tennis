// @ts-check
import { useProgressiveComments } from './useProgressiveComments';
import { listCommentsForPost, listRecentCommentsForPost } from '../services/posts';

/**
 * @param {string | null | undefined} postId
 * @param {{ knownEmpty?: boolean }} [options]
 */
export function useComments(postId, { knownEmpty = false } = {}) {
  const { comments, mutate, isLoading, isPartial, phase } = useProgressiveComments(
    postId,
    {
      fetchRecent: listRecentCommentsForPost,
      fetchAll: listCommentsForPost
    },
    { knownEmpty }
  );

  return {
    data: comments,
    mutate,
    isLoading,
    isPartial,
    phase
  };
}
