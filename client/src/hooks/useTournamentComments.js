// @ts-check
import { useProgressiveComments } from './useProgressiveComments';
import {
  listCommentsForTournamentPost,
  listRecentCommentsForTournamentPost
} from '../services/tournamentComments';

/**
 * @param {string | null | undefined} postId
 */
export function useTournamentComments(postId) {
  const { comments, mutate, isLoading, isPartial, phase } = useProgressiveComments(postId, {
    fetchRecent: listRecentCommentsForTournamentPost,
    fetchAll: listCommentsForTournamentPost
  });

  return {
    data: comments,
    mutate,
    isLoading,
    isPartial,
    phase
  };
}
