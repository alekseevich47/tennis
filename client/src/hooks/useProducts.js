// @ts-check
import useSWR from 'swr';
import { listProducts } from '../services/catalog';

/** @param {{ categoryId?: string }} [options] */
export function useProducts({ categoryId } = {}) {
  return useSWR(['products', categoryId], ([, selectedCategoryId]) =>
    listProducts({ categoryId: selectedCategoryId })
  );
}
