// @ts-check
import useSWR from 'swr';
import { listPlayers } from '../services/catalog';

export function usePlayers() {
  return useSWR(['players'], () => listPlayers());
}
