// @ts-check
import { useEffect, useState } from 'react';
import pb from '../../services/pb';
import {
  fetchBlobUrlWithProgress,
  getCachedMediaBlobUrl
} from '../../lib/fetchBlobProgress';

/**
 * Скачивает HTTP-оригинал с прогрессом → blob URL (кэш на сессию).
 *
 * @param {string} url
 * @param {boolean} enabled
 * @returns {{ progress: number | null, blobUrl: string | null, failed: boolean }}
 */
export function useFetchedOriginal(url, enabled) {
  const [progress, setProgress] = useState(() =>
    enabled && url && getCachedMediaBlobUrl(url) ? 100 : null
  );
  const [blobUrl, setBlobUrl] = useState(() =>
    enabled && url ? getCachedMediaBlobUrl(url) : null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !url) {
      setProgress(null);
      setBlobUrl(null);
      setFailed(false);
      return undefined;
    }

    const cached = getCachedMediaBlobUrl(url);
    if (cached) {
      setBlobUrl(cached);
      setProgress(100);
      setFailed(false);
      return undefined;
    }

    let cancelled = false;
    setBlobUrl(null);
    setFailed(false);
    setProgress(0);
    const headers = pb.authStore.token ? { Authorization: pb.authStore.token } : {};

    fetchBlobUrlWithProgress(url, {
      headers,
      onProgress: (percent) => {
        if (!cancelled) setProgress(percent);
      }
    })
      .then((next) => {
        if (!cancelled) {
          setBlobUrl(next);
          setProgress(100);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url, enabled]);

  return { progress, blobUrl, failed };
}
