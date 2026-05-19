// @ts-check
import useSWR from 'swr';
import { listTrainings } from '../services/trainings';

export function useTrainings() {
  return useSWR(['trainings'], () => listTrainings());
}
