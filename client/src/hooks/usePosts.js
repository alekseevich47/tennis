// @ts-check
import useSWR from 'swr';
import { listPosts } from '../services/posts';

/**
 * @param {{ includeDeleted?: boolean }} [options]
 */
export function usePosts({ includeDeleted = false } = {}) {
  return useSWR(['posts', includeDeleted], ([, flag]) => listPosts({ includeDeleted: flag }));
}
