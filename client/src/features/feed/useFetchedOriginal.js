// @ts-check
import { useEffect, useState } from 'react';
import pb from '../../services/pb';
import {
  fetchBlobUrlWithProgress,
  getCachedMediaBlobUrl,
  getCachedMediaPartialPercent
} from '../../lib/fetchBlobProgress';

/**
 * Скачивает HTTP-оригинал с прогрессом → blob URL (кэш на сессию).
 * На unmount abort; частичный ответ сохраняется и докачивается через Range.
 *
 * @param {string} url
 * @param {boolean} enabled
 * @returns {{ progress: number | null, blobUrl: string | null, failed: boolean }}
 */
export function useFetchedOriginal(url, enabled) {
  const [progress, setProgress] = useState(() => {
    if (!enabled || !url) return null;
    if (getCachedMediaBlobUrl(url)) return 100;
    return getCachedMediaPartialPercent(url);
  });
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

    const controller = new AbortController();
    let cancelled = false;
    setBlobUrl(null);
    setFailed(false);
    setProgress(getCachedMediaPartialPercent(url) || 0);
    const headers = pb.authStore.token ? { Authorization: pb.authStore.token } : {};

    fetchBlobUrlWithProgress(url, {
      signal: controller.signal,
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
      .catch((err) => {
        if (cancelled || (err && /** @type {Error} */ (err).name === 'AbortError')) return;
        setFailed(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, enabled]);

  return { progress, blobUrl, failed };
}
