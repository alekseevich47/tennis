// @ts-check
import useSWR from 'swr';
import { listTournamentPosts } from '../services/tournamentPosts';

export function useTournamentPosts() {
  return useSWR(['tournament_posts'], () => listTournamentPosts());
}
