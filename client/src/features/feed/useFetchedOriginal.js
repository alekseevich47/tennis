// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import pb from '../../services/pb';
import {
  fetchBlobUrlWithProgress,
  getCachedMediaBlobUrl,
  getCachedMediaPartialPercent,
  getPartialMediaBlob,
  PROGRESSIVE_VIDEO_MIN_BYTES
} from '../../lib/fetchBlobProgress';

/**
 * Скачивает HTTP-оригинал с прогрессом → blob URL (кэш на сессию).
 * На unmount abort; частичный ответ сохраняется и докачивается через Range.
 *
 * `progressive: true` — отдаёт playable blob URL по мере накопления байт (не ждёт 100%),
 * ephemeral partial URL revoke при апгрейде/unmount; session full blob не revoke.
 *
 * @param {string} url
 * @param {boolean} enabled
 * @param {{ progressive?: boolean }} [options]
 * @returns {{
 *   progress: number | null,
 *   blobUrl: string | null,
 *   failed: boolean,
 *   isPartial: boolean,
 *   extendPartial: () => boolean
 * }}
 */
export function useFetchedOriginal(url, enabled, options = {}) {
  const progressive = Boolean(options.progressive);
  const ephemeralUrlRef = useRef(/** @type {string | null} */ (null));
  const ephemeralBytesRef = useRef(0);
  const isPartialRef = useRef(false);

  const [progress, setProgress] = useState(() => {
    if (!enabled || !url) return null;
    if (getCachedMediaBlobUrl(url)) return 100;
    return getCachedMediaPartialPercent(url);
  });
  const [blobUrl, setBlobUrl] = useState(() =>
    enabled && url ? getCachedMediaBlobUrl(url) : null
  );
  const [isPartial, setIsPartial] = useState(false);
  const [failed, setFailed] = useState(false);

  isPartialRef.current = isPartial;

  const revokeEphemeral = useCallback(() => {
    const prev = ephemeralUrlRef.current;
    ephemeralUrlRef.current = null;
    ephemeralBytesRef.current = 0;
    if (!prev) return;
    try {
      URL.revokeObjectURL(prev);
    } catch {
      // ignore
    }
  }, []);

  const publishEphemeral = useCallback((blob) => {
    const next = URL.createObjectURL(blob);
    revokeEphemeral();
    ephemeralUrlRef.current = next;
    ephemeralBytesRef.current = blob.size;
    return next;
  }, [revokeEphemeral]);

  /**
   * Расширить playable partial (на video `waiting`) — без ожидания 100%.
   * @returns {boolean} true если src обновлён
   */
  const extendPartial = useCallback(() => {
    if (!progressive || !url || !isPartialRef.current) return false;
    if (getCachedMediaBlobUrl(url)) return false;
    const partial = getPartialMediaBlob(url);
    if (!partial || partial.size <= ephemeralBytesRef.current) return false;
    const next = publishEphemeral(partial);
    setBlobUrl(next);
    setIsPartial(true);
    return true;
  }, [progressive, url, publishEphemeral]);

  useEffect(() => {
    if (!enabled || !url) {
      revokeEphemeral();
      setProgress(null);
      setBlobUrl(null);
      setIsPartial(false);
      setFailed(false);
      return undefined;
    }

    const cached = getCachedMediaBlobUrl(url);
    if (cached) {
      revokeEphemeral();
      setBlobUrl(cached);
      setProgress(100);
      setIsPartial(false);
      setFailed(false);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    setFailed(false);
    setProgress(getCachedMediaPartialPercent(url) || 0);

    if (progressive) {
      const partial = getPartialMediaBlob(url);
      if (partial && partial.size >= PROGRESSIVE_VIDEO_MIN_BYTES) {
        setBlobUrl(publishEphemeral(partial));
        setIsPartial(true);
      } else {
        revokeEphemeral();
        setBlobUrl(null);
        setIsPartial(false);
      }
    } else {
      revokeEphemeral();
      setBlobUrl(null);
      setIsPartial(false);
    }

    const headers = pb.authStore.token ? { Authorization: pb.authStore.token } : {};
    let seededPartial = Boolean(
      progressive && ephemeralUrlRef.current && ephemeralBytesRef.current > 0
    );

    fetchBlobUrlWithProgress(url, {
      signal: controller.signal,
      headers,
      onProgress: (percent) => {
        if (!cancelled) setProgress(percent);
      },
      onPartial: progressive
        ? (blob, percent) => {
            if (cancelled) return;
            setProgress(percent);
            if (blob.size < PROGRESSIVE_VIDEO_MIN_BYTES) return;
            // Первый snapshot сразу; дальше — только по extendPartial (waiting) или полный blob.
            if (seededPartial) return;
            seededPartial = true;
            setBlobUrl(publishEphemeral(blob));
            setIsPartial(true);
          }
        : undefined
    })
      .then((next) => {
        if (cancelled) return;
        revokeEphemeral();
        setBlobUrl(next);
        setProgress(100);
        setIsPartial(false);
      })
      .catch((err) => {
        if (cancelled || (err && /** @type {Error} */ (err).name === 'AbortError')) return;
        setFailed(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
      revokeEphemeral();
    };
  }, [url, enabled, progressive, publishEphemeral, revokeEphemeral]);

  return { progress, blobUrl, failed, isPartial, extendPartial };
}
