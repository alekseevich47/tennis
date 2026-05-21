// @ts-check
import useSWR from 'swr';
import { listProductCategories } from '../services/catalog';

export function useProductCategories() {
  return useSWR(['product_categories'], () => listProductCategories());
}
