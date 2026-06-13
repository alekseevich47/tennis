// @ts-check
import useSWR from 'swr';
import { listPlayers } from '../services/catalog';

export function usePlayers(filter) {
  return useSWR(filter ? ['players', filter] : ['players'], () => listPlayers({ filter }));
}
