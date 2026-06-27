// @ts-check
import useSWR from 'swr';
import { listCommentsForTournamentPost } from '../services/tournamentComments';

/**
 * @param {string | null | undefined} postId
 */
export function useTournamentComments(postId) {
  return useSWR(
    postId ? ['tournament_comments', postId] : null,
    ([, id]) => listCommentsForTournamentPost(id)
  );
}
