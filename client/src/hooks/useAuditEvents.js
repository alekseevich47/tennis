// @ts-check
import useSWR from 'swr';
import { listAuditEvents } from '../services/auditLog';

/**
 * @param {import('../services/auditLog').AuditEventsFilters} filters
 * @param {number} [page]
 * @param {number} [perPage]
 */
export function useAuditEvents(filters, page = 1, perPage = 30) {
  const key = ['audit-events', JSON.stringify(filters), page, perPage];
  const { data, error, isLoading, mutate } = useSWR(key, () =>
    listAuditEvents({ ...filters, page, perPage })
  );

  return {
    items: data?.items ?? [],
    totalItems: data?.totalItems ?? 0,
    totalPages: data?.totalPages ?? 0,
    page: data?.page ?? page,
    perPage: data?.perPage ?? perPage,
    isLoading,
    error,
    mutate
  };
}
