// @ts-check
import useSWR from 'swr';
import { listGallery } from '../services/catalog';

export function useGallery() {
  return useSWR(['gallery'], () => listGallery());
}
