// @ts-check
import useSWR from 'swr';
import { listScheduledPosts } from '../services/posts';
import { listScheduledTournamentPosts } from '../services/tournamentPosts';

/**
 * @param {'posts' | 'tournament_posts'} kind
 * @param {{ enabled?: boolean }} [options]
 */
export function useScheduledPosts(kind, { enabled = true } = {}) {
  const key = enabled
    ? kind === 'tournament_posts'
      ? /** @type {const} */ (['scheduled_tournament_posts'])
      : /** @type {const} */ (['scheduled_posts'])
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () =>
      kind === 'tournament_posts' ? listScheduledTournamentPosts() : listScheduledPosts(),
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000
    }
  );

  return {
    items: data || [],
    count: data?.length || 0,
    error,
    isLoading,
    mutate
  };
}
