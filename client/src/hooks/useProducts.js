// @ts-check
import useSWR from 'swr';
import { listProducts } from '../services/catalog';

export function useProducts() {
  return useSWR(['products'], () => listProducts());
}
