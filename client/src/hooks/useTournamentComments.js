// @ts-check
import { useProgressiveComments } from './useProgressiveComments';
import {
  listCommentsForTournamentPost,
  listRecentCommentsForTournamentPost
} from '../services/tournamentComments';

/**
 * @param {string | null | undefined} postId
 * @param {{ knownEmpty?: boolean }} [options]
 */
export function useTournamentComments(postId, { knownEmpty = false } = {}) {
  const { comments, mutate, isLoading, isPartial, phase } = useProgressiveComments(
    postId,
    {
      fetchRecent: listRecentCommentsForTournamentPost,
      fetchAll: listCommentsForTournamentPost
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
