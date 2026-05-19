// @ts-check
import useSWR from 'swr';
import { listMatches } from '../services/catalog';

/**
 * @param {string | null | undefined} championshipId
 */
export function useMatches(championshipId) {
  return useSWR(championshipId ? ['matches', championshipId] : null, ([, id]) => listMatches(id));
}
