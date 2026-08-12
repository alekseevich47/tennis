// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractYadiskUrls,
  hasYadiskAlbum,
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
 *   path?: string | null,
 *   name: string,
 *   isVideo: boolean,
 *   url: string,
 *   fileUrl?: string | null,
 *   status: 'loading' | 'ready' | 'error',
 *   error?: string,
 *   source: 'yadisk',
 *   isAlbum?: boolean,
 *   albumItems?: Array<{
 *     key: string,
 *     publicUrl: string,
 *     path: string,
 *     name: string,
 *     isVideo: boolean,
 *     url: string,
 *     fileUrl?: string | null,
 *     status: 'loading' | 'ready' | 'error'
 *   }>
 * }} YadiskEmbedItem
 */

/**
 * Детект ссылок Яндекс.Диска в тексте поста → превью (как в Telegram).
 * Альбом: одна запись; одиночные: до remainingSlots. Взаимоисключение через onConflict*.
 *
 * @param {{
 *   text: string,
 *   setText: (next: string) => void,
 *   remainingSlots: number,
 *   initialKey?: string | null,
 *   initialItems?: unknown,
 *   enabled?: boolean,
 *   hasLocalMedia?: boolean,
 *   onClearLocalMedia?: () => void | Promise<void>,
 *   onAlbumConflict?: () => Promise<boolean>,
 *   onSinglesConflict?: () => Promise<boolean>
 * }} options
 */
export function useYadiskEmbed({
  text,
  setText,
  remainingSlots,
  initialKey = null,
  initialItems,
  enabled = true,
  hasLocalMedia = false,
  onClearLocalMedia,
  onAlbumConflict,
  onSinglesConflict
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
  const hasLocalMediaRef = useRef(hasLocalMedia);
  hasLocalMediaRef.current = hasLocalMedia;
  const onClearLocalMediaRef = useRef(onClearLocalMedia);
  onClearLocalMediaRef.current = onClearLocalMedia;
  const onAlbumConflictRef = useRef(onAlbumConflict);
  onAlbumConflictRef.current = onAlbumConflict;
  const onSinglesConflictRef = useRef(onSinglesConflict);
  onSinglesConflictRef.current = onSinglesConflict;

  const objectKey = useCallback((publicUrl, path = '') => `${publicUrl}::${path || ''}`, []);

  const revokeObjectUrl = useCallback((key) => {
    const prev = objectUrlsRef.current.get(key);
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    objectUrlsRef.current.delete(key);
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
    itemsRef.current = [];
    setItems([]);
  }, [clearRequests]);

  const applyFileResolved = useCallback(
    (publicUrl, path, resolved, objectUrl) => {
      const isVideo = resolved.mediaType === 'video';
      const key = objectKey(publicUrl, path);
      revokeObjectUrl(key);
      objectUrlsRef.current.set(key, objectUrl);
      const displayUrl = isVideo ? videoPreviewUrl(objectUrl) : objectUrl;
      setItems((current) =>
        current.map((item) => {
          if (item.isAlbum && item.publicUrl === publicUrl) {
            const albumItems = (item.albumItems || []).map((entry) =>
              entry.path === path
                ? {
                    ...entry,
                    name: resolved.name || entry.name,
                    isVideo,
                    url: displayUrl,
                    fileUrl: objectUrl,
                    status: /** @type {const} */ ('ready')
                  }
                : entry
            );
            const cover = albumItems[0];
            return {
              ...item,
              name: item.name,
              isVideo: cover?.isVideo || false,
              url: cover?.url || '',
              fileUrl: cover?.fileUrl || null,
              status: cover?.status === 'ready' ? 'ready' : item.status,
              albumItems,
              error: undefined
            };
          }
          if (item.publicUrl === publicUrl && !item.isAlbum) {
            return {
              ...item,
              name: resolved.name || item.name,
              isVideo,
              url: displayUrl,
              fileUrl: objectUrl,
              status: 'ready',
              error: undefined
            };
          }
          return item;
        })
      );
    },
    [objectKey, revokeObjectUrl]
  );

  const applyError = useCallback(
    (publicUrl, message, forget = false, path = '') => {
      if (forget) knownRef.current.delete(publicUrl);
      revokeObjectUrl(objectKey(publicUrl, path));
      setItems((current) =>
        current.map((item) => {
          if (item.isAlbum && item.publicUrl === publicUrl) {
            if (path) {
              const albumItems = (item.albumItems || []).map((entry) =>
                entry.path === path
                  ? { ...entry, status: /** @type {const} */ ('error'), url: '' }
                  : entry
              );
              const cover = albumItems[0];
              return {
                ...item,
                albumItems,
                status: cover?.status === 'error' ? 'error' : item.status,
                error: cover?.status === 'error' ? message || 'Не удалось загрузить' : item.error,
                url: cover?.url || item.url
              };
            }
            return { ...item, status: 'error', error: message || 'Не удалось загрузить', url: '' };
          }
          if (item.publicUrl === publicUrl && !item.isAlbum) {
            return { ...item, status: 'error', error: message || 'Не удалось загрузить', url: '' };
          }
          return item;
        })
      );
    },
    [objectKey, revokeObjectUrl]
  );

  const startResolveFile = useCallback(
    (publicUrl, path = '', { forgetOnError = false } = {}) => {
      const pendingKey = objectKey(publicUrl, path);
      if (pendingRef.current.has(pendingKey)) return;
      pendingRef.current.add(pendingKey);
      knownRef.current.add(publicUrl);
      const controller = new AbortController();
      abortMapRef.current.set(pendingKey, controller);
      fetchYadiskPreview(publicUrl, { signal: controller.signal, path: path || null })
        .then(async (resolved) => {
          if (resolved.type === 'album') {
            throw new Error('Ожидался файл');
          }
          const kind = resolved.mediaType === 'video' ? 'file' : 'preview';
          const objectUrl = await fetchYadiskObjectUrl(publicUrl, kind, {
            signal: controller.signal,
            path: path || null
          });
          pendingRef.current.delete(pendingKey);
          abortMapRef.current.delete(pendingKey);
          applyFileResolved(publicUrl, path, resolved, objectUrl);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          pendingRef.current.delete(pendingKey);
          abortMapRef.current.delete(pendingKey);
          applyError(publicUrl, err?.message, forgetOnError, path);
        });
    },
    [applyError, applyFileResolved, objectKey]
  );

  const startResolveAlbum = useCallback(
    (publicUrl, { forgetOnError = false } = {}) => {
      if (pendingRef.current.has(publicUrl)) return;
      pendingRef.current.add(publicUrl);
      knownRef.current.add(publicUrl);
      const controller = new AbortController();
      abortMapRef.current.set(publicUrl, controller);
      fetchYadiskPreview(publicUrl, { signal: controller.signal })
        .then(async (resolved) => {
          if (resolved.type !== 'album' || !resolved.items?.length) {
            throw new Error(resolved.type === 'file' ? 'Это файл, не альбом' : 'Пустой альбом');
          }

          const albumItems = resolved.items.map((entry, index) => ({
            key: `yadisk-album-${publicUrl}-${entry.path || index}`,
            publicUrl,
            path: entry.path || '',
            name: entry.name || `media-${index + 1}`,
            isVideo: entry.mediaType === 'video',
            url: '',
            status: /** @type {const} */ ('loading')
          }));

          setItems((current) =>
            current.map((item) =>
              item.publicUrl === publicUrl
                ? {
                    ...item,
                    name: resolved.name || item.name,
                    isAlbum: true,
                    isVideo: albumItems[0]?.isVideo || false,
                    albumItems,
                    status: 'loading'
                  }
                : item
            )
          );

          pendingRef.current.delete(publicUrl);
          abortMapRef.current.delete(publicUrl);

          // Обложка сразу; остальные — фоновая предзагрузка preview.
          albumItems.forEach((entry, index) => {
            startResolveFile(publicUrl, entry.path, { forgetOnError: index === 0 && forgetOnError });
          });
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          pendingRef.current.delete(publicUrl);
          abortMapRef.current.delete(publicUrl);
          applyError(publicUrl, err?.message, forgetOnError);
        });
    },
    [applyError, startResolveFile]
  );

  const startResolve = useCallback(
    (publicUrl, { forgetOnError = false } = {}) => {
      if (pendingRef.current.has(publicUrl)) return;
      pendingRef.current.add(publicUrl);
      knownRef.current.add(publicUrl);
      const controller = new AbortController();
      abortMapRef.current.set(publicUrl, controller);
      fetchYadiskPreview(publicUrl, { signal: controller.signal })
        .then(async (resolved) => {
          if (resolved.type === 'album') {
            pendingRef.current.delete(publicUrl);
            abortMapRef.current.delete(publicUrl);
            const albumItems = (resolved.items || []).map((entry, index) => ({
              key: `yadisk-album-${publicUrl}-${entry.path || index}`,
              publicUrl,
              path: entry.path || '',
              name: entry.name || `media-${index + 1}`,
              isVideo: entry.mediaType === 'video',
              url: '',
              status: /** @type {const} */ ('loading')
            }));
            setItems((current) =>
              current.map((item) =>
                item.publicUrl === publicUrl
                  ? {
                      ...item,
                      name: resolved.name || item.name,
                      isAlbum: true,
                      isVideo: albumItems[0]?.isVideo || false,
                      albumItems,
                      status: 'loading'
                    }
                  : item
              )
            );
            albumItems.forEach((entry, index) => {
              startResolveFile(publicUrl, entry.path, {
                forgetOnError: index === 0 && forgetOnError
              });
            });
            return;
          }

          const kind = resolved.mediaType === 'video' ? 'file' : 'preview';
          const objectUrl = await fetchYadiskObjectUrl(publicUrl, kind, {
            signal: controller.signal
          });
          pendingRef.current.delete(publicUrl);
          abortMapRef.current.delete(publicUrl);
          applyFileResolved(publicUrl, '', resolved, objectUrl);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          pendingRef.current.delete(publicUrl);
          abortMapRef.current.delete(publicUrl);
          applyError(publicUrl, err?.message, forgetOnError);
        });
    },
    [applyError, applyFileResolved, startResolveFile]
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
        source: 'yadisk',
        isAlbum: entry.type === 'album'
      }))
    );
    stored.forEach((entry) => {
      if (entry.type === 'album') startResolveAlbum(entry.publicUrl);
      else startResolve(entry.publicUrl);
    });

    return () => clearRequests();
    // Только смена поста (initialKey); initialItems читаем из ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = window.setTimeout(() => {
      const urls = extractYadiskUrls(text);
      if (!urls.length) return;

      void (async () => {
        const current = itemsRef.current;
        const albumPresent = current.some((item) => item.isAlbum);
        const singlesPresent = current.some((item) => !item.isAlbum);
        const localPresent = hasLocalMediaRef.current;

        /** @type {string[]} */
        const accepted = [];
        /** @type {string[]} */
        const alreadyKnown = [];

        for (const url of urls) {
          if (knownRef.current.has(url) || pendingRef.current.has(url)) {
            alreadyKnown.push(url);
            continue;
          }

          // Сначала узнаём тип через preview (лёгкий meta).
          try {
            const probeController = new AbortController();
            abortMapRef.current.set(`probe-${url}`, probeController);
            const probed = await fetchYadiskPreview(url, { signal: probeController.signal });
            abortMapRef.current.delete(`probe-${url}`);

            if (probed.type === 'album') {
              if (singlesPresent || localPresent || current.length > 0) {
                const ok = onAlbumConflictRef.current
                  ? await onAlbumConflictRef.current()
                  : false;
                if (!ok) {
                  const stripped = stripYadiskUrlsFromHtml(text, [url]);
                  if (stripped !== text) setText(stripped);
                  continue;
                }
                reset();
                await onClearLocalMediaRef.current?.();
              } else if (albumPresent) {
                // Уже есть альбом — заменяем
                const ok = onAlbumConflictRef.current
                  ? await onAlbumConflictRef.current()
                  : true;
                if (!ok) {
                  const stripped = stripYadiskUrlsFromHtml(text, [url]);
                  if (stripped !== text) setText(stripped);
                  continue;
                }
                reset();
              }
              accepted.push(url);
              // Альбом занимает единственный слот — дальше не принимаем
              break;
            }

            // Одиночный файл
            if (albumPresent || itemsRef.current.some((item) => item.isAlbum)) {
              const ok = onSinglesConflictRef.current
                ? await onSinglesConflictRef.current()
                : false;
              if (!ok) {
                const stripped = stripYadiskUrlsFromHtml(text, [url]);
                if (stripped !== text) setText(stripped);
                continue;
              }
              reset();
            }

            const slotsLeft = Math.max(0, remainingSlots - itemsRef.current.length - accepted.length);
            if (slotsLeft <= 0) break;
            accepted.push(url);
          } catch (err) {
            abortMapRef.current.delete(`probe-${url}`);
            if (err?.name === 'AbortError') return;
            // Неизвестный URL — пробуем как обычный файл через startResolve
            if (albumPresent || itemsRef.current.some((item) => item.isAlbum)) {
              const ok = onSinglesConflictRef.current
                ? await onSinglesConflictRef.current()
                : false;
              if (!ok) {
                const stripped = stripYadiskUrlsFromHtml(text, [url]);
                if (stripped !== text) setText(stripped);
                continue;
              }
              reset();
            }
            const slotsLeft = Math.max(0, remainingSlots - itemsRef.current.length - accepted.length);
            if (slotsLeft <= 0) break;
            accepted.push(url);
          }
        }

        if (!accepted.length) {
          if (alreadyKnown.length) {
            const stripped = stripYadiskUrlsFromHtml(text, alreadyKnown);
            if (stripped !== text) setText(stripped);
          }
          return;
        }

        setItems((currentItems) => [
          ...currentItems,
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
      })();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [text, setText, remainingSlots, enabled, reset, startResolve]);

  const removeItem = useCallback(
    (key) => {
      setItems((current) => {
        const target = current.find((item) => item.key === key);
        if (target) {
          knownRef.current.delete(target.publicUrl);
          pendingRef.current.delete(target.publicUrl);
          abortMapRef.current.get(target.publicUrl)?.abort();
          abortMapRef.current.delete(target.publicUrl);
          if (target.isAlbum) {
            (target.albumItems || []).forEach((entry) => {
              const k = objectKey(target.publicUrl, entry.path);
              pendingRef.current.delete(k);
              abortMapRef.current.get(k)?.abort();
              abortMapRef.current.delete(k);
              revokeObjectUrl(k);
            });
          }
          revokeObjectUrl(objectKey(target.publicUrl, ''));
        }
        return current.filter((item) => item.key !== key);
      });
    },
    [objectKey, revokeObjectUrl]
  );

  const previewItems = items.map((item) => ({
    key: item.key,
    url: item.url || '',
    name: item.name,
    isVideo: item.isVideo,
    status: item.status,
    error: item.error,
    source: item.source,
    isAlbum: Boolean(item.isAlbum),
    albumCount: item.isAlbum ? item.albumItems?.length || 0 : 0,
    albumViewerItems: item.isAlbum
      ? (item.albumItems || []).map((entry) => ({
          key: entry.key,
          url: entry.url || '',
          name: entry.name,
          isVideo: entry.isVideo,
          status: entry.status
        }))
      : undefined
  }));

  const storedMedia = items
    .filter((item) => {
      if (item.isAlbum) {
        return (item.albumItems || []).some((entry) => entry.status === 'ready');
      }
      return item.status === 'ready';
    })
    .map((item) =>
      toStoredExternalMedia({
        publicUrl: item.publicUrl,
        name: item.name,
        mediaType: item.isVideo ? 'video' : 'image',
        source: 'yadisk',
        type: item.isAlbum ? 'album' : 'file'
      })
    );

  const hasPending = items.some((item) => {
    if (item.status === 'loading') return true;
    if (item.isAlbum) {
      const cover = item.albumItems?.[0];
      return !cover || cover.status === 'loading';
    }
    return false;
  });
  const readyCount = items.filter((item) => {
    if (item.isAlbum) return (item.albumItems || []).some((entry) => entry.status === 'ready');
    return item.status === 'ready';
  }).length;

  const albumMode = hasYadiskAlbum(
    items.map((item) => ({
      source: 'yadisk',
      publicUrl: item.publicUrl,
      name: item.name,
      mediaType: item.isVideo ? 'video' : 'image',
      type: item.isAlbum ? 'album' : 'file'
    }))
  );

  return {
    items,
    previewItems,
    storedMedia,
    removeItem,
    reset,
    hasPending,
    readyCount,
    count: items.length,
    albumMode
  };
}
