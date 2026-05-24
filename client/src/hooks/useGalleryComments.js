// @ts-check
import useSWR from 'swr';
import { listGalleryComments } from '../services/catalog';

/**
 * @param {string | null | undefined} mediaId
 */
export function useGalleryComments(mediaId) {
  const { data, mutate, isLoading } = useSWR(
    mediaId ? ['gallery_comments', mediaId] : null,
    ([, id]) => listGalleryComments(id)
  );

  return {
    comments: data || [],
    mutate,
    isLoading
  };
}
