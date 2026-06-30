// @ts-check
import useSWR from 'swr';
import { listTournamentPosts } from '../services/tournamentPosts';

/**
 * @param {{ includeDeleted?: boolean }} [options]
 */
export function useTournamentPosts({ includeDeleted = false } = {}) {
  return useSWR(
    ['tournament_posts', includeDeleted],
    ([, flag]) => listTournamentPosts({ includeDeleted: flag })
  );
}
