// @ts-check
import { useProgressiveComments } from './useProgressiveComments';
import { listGalleryComments, listRecentGalleryComments } from '../services/catalog';

/**
 * @param {string | null | undefined} mediaId
 */
export function useGalleryComments(mediaId) {
  const { comments, mutate, isLoading, isPartial, phase } = useProgressiveComments(mediaId, {
    fetchRecent: listRecentGalleryComments,
    fetchAll: listGalleryComments
  });

  return {
    comments,
    mutate,
    isLoading,
    isPartial,
    phase
  };
}
