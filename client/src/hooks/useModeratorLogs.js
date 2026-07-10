// @ts-check
import useSWR from 'swr';
import { listModeratorLogs } from '../services/admin';

/**
 * @param {{ start: string, end: string }} params
 */
export function useModeratorLogs({ start, end }) {
  return useSWR(['moderator-logs', start, end], () => listModeratorLogs({ start, end }));
}
