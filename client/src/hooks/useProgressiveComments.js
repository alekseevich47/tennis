// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {string | null | undefined} resourceId
 * @param {{
 *   fetchRecent: (id: string, limit: number, options?: { signal?: AbortSignal }) => Promise<any[]>,
 *   fetchAll: (id: string, options?: { signal?: AbortSignal }) => Promise<any[]>
 * }} fetchers
 * @param {{ knownEmpty?: boolean }} [options]
 */
export function useProgressiveComments(resourceId, { fetchRecent, fetchAll }, { knownEmpty = false } = {}) {
  const [phase, setPhase] = useState(/** @type {'idle' | 'loading' | 'partial' | 'ready'} */ ('idle'));
  const [comments, setComments] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchersRef = useRef({ fetchRecent, fetchAll });
  fetchersRef.current = { fetchRecent, fetchAll };

  useEffect(() => {
    if (!resourceId) {
      setPhase('idle');
      setComments([]);
      return undefined;
    }

    if (knownEmpty && refreshKey === 0) {
      setPhase('ready');
      setComments([]);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setPhase('loading');
      setComments([]);
      try {
        const recent = await fetchersRef.current.fetchRecent(resourceId, 2, {
          signal: controller.signal
        });
        if (cancelled) return;
        setComments(recent);
        setPhase('partial');

        const all = await fetchersRef.current.fetchAll(resourceId, {
          signal: controller.signal
        });
        if (cancelled) return;
        setComments(all);
        setPhase('ready');
      } catch (err) {
        if (cancelled || (err && /** @type {Error} */ (err).name === 'AbortError')) return;
        setPhase('ready');
        setComments([]);
      }
    };

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resourceId, refreshKey, knownEmpty]);

  const mutate = useCallback(async () => {
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    comments,
    phase,
    isLoading: phase === 'loading',
    isPartial: phase === 'partial',
    mutate
  };
}
