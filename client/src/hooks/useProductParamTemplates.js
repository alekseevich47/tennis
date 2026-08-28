// @ts-check
import useSWR from 'swr';
import { listProductParamTemplates } from '../services/catalog';

export function useProductParamTemplates() {
  return useSWR(['product_param_templates'], () => listProductParamTemplates());
}
