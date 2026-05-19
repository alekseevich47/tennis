// @ts-check
import useSWR from 'swr';
import { listChampionships } from '../services/catalog';

export function useChampionships() {
  return useSWR(['championships'], () => listChampionships());
}
