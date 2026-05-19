// @ts-check
import useSWR from 'swr';
import { listCommentsForPost } from '../services/posts';

/**
 * @param {string | null | undefined} postId
 */
export function useComments(postId) {
  return useSWR(postId ? ['comments', postId] : null, ([, id]) => listCommentsForPost(id));
}
