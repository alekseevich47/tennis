// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractYadiskUrls,
  normalizeExternalMedia,
  stripYadiskUrlsFromHtml,
  toStoredExternalMedia
} from '../../lib/yadisk';
import { fetchYadiskObjectUrl, fetchYadiskPreview } from '../../services/yadisk';
import { videoPreviewUrl } from '../../lib/media';

/**
 * @typedef {{
 *   key: string,
 *   publicUrl: string,
 *   name: string,
 *   isVideo: boolean,
 *   url: string,
 *   fileUrl?: string | null,
 *   status: 'loading' | 'ready' | 'error',
 *   error?: string,
 *   source: 'yadisk'
 * }} YadiskEmbedItem
 */

/**
 * Детект ссылок Яндекс.Диска в тексте поста → превью (как в Telegram).
 *
 * @param {{
 *   text: string,
 *   setText: (next: string) => void,
 *   remainingSlots: number,
 *   initialKey?: string | null,
 *   initialItems?: unknown,
 *   enabled?: boolean
 * }} options
 */
export function useYadiskEmbed({
  text,
  setText,
  remainingSlots,
  initialKey = null,
  initialItems,
  enabled = true
}) {
  const [items, setItems] = useState(/** @type {YadiskEmbedItem[]} */ ([]));
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const initialItemsRef = useRef(initialItems);
  initialItemsRef.current = initialItems;
  const pendingRef = useRef(/** @type {Set<string>} */ (new Set()));
  const knownRef = useRef(/** @type {Set<string>} */ (new Set()));
  const abortMapRef = useRef(/** @type {Map<string, AbortController>} */ (new Map()));
  const objectUrlsRef = useRef(/** @type {Map<string, string>} */ (new Map()));

  const revokeObjectUrl = useCallback((publicUrl) => {
    const prev = objectUrlsRef.current.get(publicUrl);
    if (prev) {
      URL.revokeObjectURL(prev);
      objectUrlsRef.current.delete(publicUrl);
    }
  }, []);

  const clearRequests = useCallback(() => {
    abortMapRef.current.forEach((controller) => controller.abort());
    abortMapRef.current.clear();
    pendingRef.current.clear();
  }, []);

  const reset = useCallback(() => {
    clearRequests();
    knownRef.current.clear();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setItems([]);
  }, [clearRequests]);

  const applyResolved = useCallback(
    (publicUrl, resolved, objectUrl) => {
      const isVideo = resolved.mediaType === 'video';
      revokeObjectUrl(publicUrl);
      objectUrlsRef.current.set(publicUrl, objectUrl);
      const displayUrl = isVideo ? videoPreviewUrl(objectUrl) : objectUrl;
      setItems((current) =>
        current.map((item) =>
          item.publicUrl === publicUrl
            ? {
                ...item,
                name: resolved.name || item.name,
                isVideo,
                url: displayUrl,
                fileUrl: objectUrl,
                status: 'ready',
                error: undefined
              }
            : item
        )
      );
    },
    [revokeObjectUrl]
  );

  const applyError = useCallback((publicUrl, message, forget = false) => {
    if (forget) knownRef.current.delete(publicUrl);
    revokeObjectUrl(publicUrl);
    setItems((current) =>
      current.map((item) =>
        item.publicUrl === publicUrl
          ? { ...item, status: 'error', error: message || 'Не удалось загрузить', url: '' }
          : item
      )
    );
  }, [revokeObjectUrl]);

  const startResolve = useCallback(
    (publicUrl, { forgetOnError = false } = {}) => {
      if (pendingRef.current.has(publicUrl)) return;
      pendingRef.current.add(publicUrl);
      knownRef.current.add(publicUrl);
      const controller = new AbortController();
      abortMapRef.current.set(publicUrl, controller);
      fetchYadiskPreview(publicUrl, { signal: controller.signal })
        .then(async (resolved) => {
          const kind = resolved.mediaType === 'video' ? 'file' : 'preview';
          const objectUrl = await fetchYadiskObjectUrl(publicUrl, kind, {
            signal: controller.signal
          });
          pendingRef.current.delete(publicUrl);
          abortMapRef.current.delete(publicUrl);
          applyResolved(publicUrl, resolved, objectUrl);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          pendingRef.current.delete(publicUrl);
          abortMapRef.current.delete(publicUrl);
          applyError(publicUrl, err?.message, forgetOnError);
        });
    },
    [applyError, applyResolved]
  );

  useEffect(() => {
    clearRequests();
    knownRef.current.clear();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();

    const stored = normalizeExternalMedia(initialItemsRef.current);
    if (!initialKey || !stored.length) {
      setItems([]);
      return undefined;
    }

    setItems(
      stored.map((entry) => ({
        key: `yadisk-${entry.publicUrl}`,
        publicUrl: entry.publicUrl,
        name: entry.name,
        isVideo: entry.mediaType === 'video',
        url: '',
        status: /** @type {const} */ ('loading'),
        source: 'yadisk'
      }))
    );
    stored.forEach((entry) => startResolve(entry.publicUrl));

    return () => clearRequests();
    // Только смена поста (initialKey); initialItems читаем из ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = window.setTimeout(() => {
      const urls = extractYadiskUrls(text);
      if (!urls.length) return;

      const freeSlots = Math.max(0, remainingSlots - itemsRef.current.length);
      /** @type {string[]} */
      const accepted = [];
      for (const url of urls) {
        if (knownRef.current.has(url) || pendingRef.current.has(url)) continue;
        if (accepted.length >= freeSlots) break;
        accepted.push(url);
      }

      const alreadyKnown = urls.filter((url) => knownRef.current.has(url));
      if (!accepted.length) {
        if (alreadyKnown.length) {
          const stripped = stripYadiskUrlsFromHtml(text, alreadyKnown);
          if (stripped !== text) setText(stripped);
        }
        return;
      }

      setItems((current) => [
        ...current,
        ...accepted.map((url) => ({
          key: `yadisk-${url}`,
          publicUrl: url,
          name: 'Яндекс.Диск…',
          isVideo: false,
          url: '',
          status: /** @type {const} */ ('loading'),
          source: 'yadisk'
        }))
      ]);
      accepted.forEach((url) => startResolve(url));

      const stripped = stripYadiskUrlsFromHtml(text, [...accepted, ...alreadyKnown]);
      if (stripped !== text) setText(stripped);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [text, setText, remainingSlots, enabled, startResolve]);

  const removeItem = useCallback((key) => {
    setItems((current) => {
      const target = current.find((item) => item.key === key);
      if (target) {
        knownRef.current.delete(target.publicUrl);
        pendingRef.current.delete(target.publicUrl);
        abortMapRef.current.get(target.publicUrl)?.abort();
        abortMapRef.current.delete(target.publicUrl);
        revokeObjectUrl(target.publicUrl);
      }
      return current.filter((item) => item.key !== key);
    });
  }, [revokeObjectUrl]);

  const previewItems = items.map((item) => ({
    key: item.key,
    url: item.url || '',
    name: item.name,
    isVideo: item.isVideo,
    status: item.status,
    error: item.error,
    source: item.source
  }));

  const storedMedia = items
    .filter((item) => item.status === 'ready')
    .map((item) =>
      toStoredExternalMedia({
        publicUrl: item.publicUrl,
        name: item.name,
        mediaType: item.isVideo ? 'video' : 'image',
        source: 'yadisk'
      })
    );

  const hasPending = items.some((item) => item.status === 'loading');
  const readyCount = items.filter((item) => item.status === 'ready').length;

  return {
    items,
    previewItems,
    storedMedia,
    removeItem,
    reset,
    hasPending,
    readyCount,
    count: items.length
  };
}
