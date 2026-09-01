// @ts-check
import { useProgressiveComments } from './useProgressiveComments';
import { listCommentsForPost, listRecentCommentsForPost } from '../services/posts';

/**
 * @param {string | null | undefined} postId
 */
export function useComments(postId) {
  const { comments, mutate, isLoading, isPartial, phase } = useProgressiveComments(postId, {
    fetchRecent: listRecentCommentsForPost,
    fetchAll: listCommentsForPost
  });

  return {
    data: comments,
    mutate,
    isLoading,
    isPartial,
    phase
  };
}
