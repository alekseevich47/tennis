// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeExternalMedia } from '../../lib/yadisk';
import { fetchYadiskObjectUrl, fetchYadiskPreview } from '../../services/yadisk';
import { videoPreviewUrl } from '../../lib/media';
import { setYadiskAlbumCache } from './yadiskAlbumCache';
import {
  getCachedMemberBytes,
  isSessionCachedBlobUrl,
  setCachedMemberBytes
} from './yadiskMediaSessionCache';
import {
  ALBUM_COVER_RADIUS,
  ALBUM_WINDOW_RADIUS,
  createAlbumWindowController,
  registerAlbumLazyFocus,
  requestAlbumLazyFocus
} from './yadiskAlbumLazy';

/**
 * @typedef {{
 *   filename: string,
 *   url: string,
 *   thumbUrl: string,
 *   previewUrl: string,
 *   isVideo: boolean,
 *   originKey: string,
 *   publicUrl: string,
 *   path?: string | null,
 *   isLoading?: boolean,
 *   isAlbumCover?: boolean,
 *   albumId?: string | null,
 *   albumCount?: number
 * }} ResolvedExternalMediaItem
 */

/**
 * @param {ResolvedExternalMediaItem[]} list
 */
function publishAlbums(list) {
  /** @type {Map<string, ResolvedExternalMediaItem[]>} */
  const byUrl = new Map();
  for (const item of list) {
    if (!item.albumId || !item.publicUrl) continue;
    const bucket = byUrl.get(item.publicUrl) || [];
    bucket.push(item);
    byUrl.set(item.publicUrl, bucket);
  }
  byUrl.forEach((albumItems, publicUrl) => {
    setYadiskAlbumCache(
      publicUrl,
      albumItems.map((entry, index) => ({
        filename: entry.filename,
        url: entry.url,
        thumbUrl: entry.thumbUrl,
        previewUrl: entry.previewUrl,
        isVideo: entry.isVideo,
        originKey: entry.path || `${publicUrl}::${index}`,
        publicUrl: entry.publicUrl,
        path: entry.path,
        isLoading: entry.isLoading
      }))
    );
  });
}

/**
 * Резолв `posts.external_media` для сетки ленты через серверный прокси → blob URL.
 * Альбом: meta сразу, байты — обложка; окно ±N по focus (свайп/fullscreen).
 *
 * @param {unknown} externalMedia
 * @param {string} originPrefix
 * @returns {{
 *   items: ResolvedExternalMediaItem[],
 *   setAlbumFocus: (publicUrl: string, index: number, options?: { radius?: number, preferFull?: boolean }) => void
 * }}
 */
export function useResolvedExternalMedia(externalMedia, originPrefix) {
  const [items, setItems] = useState(/** @type {ResolvedExternalMediaItem[]} */ ([]));
  const focusHandlersRef = useRef(
    /** @type {Map<string, (index: number, options?: { radius?: number }) => void>} */ (new Map())
  );

  const setAlbumFocus = useCallback((publicUrl, index, options) => {
    focusHandlersRef.current.get(publicUrl)?.(index, options);
    requestAlbumLazyFocus(publicUrl, index, options);
  }, []);

  useEffect(() => {
    const stored = normalizeExternalMedia(externalMedia);
    if (!stored.length) {
      setItems([]);
      focusHandlersRef.current.clear();
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    /** @type {string[]} */
    const objectUrls = [];
    /** @type {ResolvedExternalMediaItem[]} */
    let working = [];
    /** @type {Array<{ destroy: () => void }>} */
    const albumControllers = [];
    /** @type {Array<() => void>} */
    const unsubs = [];

    const track = (url) => {
      objectUrls.push(url);
      return url;
    };

    /**
     * @param {ResolvedExternalMediaItem[]} next
     */
    const commit = (next) => {
      working = next;
      if (cancelled) return;
      setItems(next);
      publishAlbums(next);
    };

    /**
     * @param {string} originKey
     * @param {Partial<ResolvedExternalMediaItem>} patch
     */
    const patchItem = (originKey, patch) => {
      if (cancelled) return;
      commit(
        working.map((item) => (item.originKey === originKey ? { ...item, ...patch } : item))
      );
    };

    /**
     * @param {string} originKey
     */
    const dropItem = (originKey) => {
      if (cancelled) return;
      commit(working.filter((item) => item.originKey !== originKey));
    };

    /**
     * @param {ResolvedExternalMediaItem} base
     * @param {string} publicUrl
     * @param {string | null | undefined} path
     */
    const resolveFileBytes = async (base, publicUrl, path) => {
      const originKey = base.originKey;
      try {
        const resolved = await fetchYadiskPreview(publicUrl, {
          signal: controller.signal,
          path: path || null
        });
        if (cancelled) return;

        const isVideo = resolved.mediaType === 'video';
        const filename = resolved.name || base.filename;

        if (isVideo) {
          const objectUrl = track(
            await fetchYadiskObjectUrl(publicUrl, 'file', {
              signal: controller.signal,
              path: path || null
            })
          );
          if (cancelled) return;
          const display = videoPreviewUrl(objectUrl);
          setCachedMemberBytes(publicUrl, path, {
            previewUrl: objectUrl,
            fileUrl: objectUrl,
            isVideo: true,
            name: filename,
            displayUrl: display
          });
          patchItem(originKey, {
            filename,
            url: display,
            thumbUrl: objectUrl,
            previewUrl: objectUrl,
            isVideo: true,
            isLoading: false
          });
          return;
        }

        const previewObjectUrl = track(
          await fetchYadiskObjectUrl(publicUrl, 'preview', {
            signal: controller.signal,
            path: path || null
          })
        );
        if (cancelled) return;

        setCachedMemberBytes(publicUrl, path, {
          previewUrl: previewObjectUrl,
          fileUrl: null,
          isVideo: false,
          name: filename,
          displayUrl: previewObjectUrl
        });

        patchItem(originKey, {
          filename,
          url: previewObjectUrl,
          thumbUrl: previewObjectUrl,
          previewUrl: previewObjectUrl,
          isVideo: false,
          isLoading: false
        });
      } catch (err) {
        if (err?.name === 'AbortError' || cancelled) return;
        dropItem(originKey);
      }
    };

    /** @type {ResolvedExternalMediaItem[]} */
    const placeholders = stored.map((entry, index) => {
      if (entry.type === 'album') {
        const albumId = `${originPrefix}-album-${index}`;
        return {
          filename: entry.name || 'Альбом',
          url: '',
          thumbUrl: '',
          previewUrl: '',
          isVideo: false,
          originKey: `${albumId}-cover`,
          publicUrl: entry.publicUrl,
          path: null,
          isLoading: true,
          isAlbumCover: true,
          albumId,
          albumCount: 0
        };
      }
      return {
        filename: entry.name,
        url: '',
        thumbUrl: '',
        previewUrl: '',
        isVideo: entry.mediaType === 'video',
        originKey: `${originPrefix}-ext-${index}`,
        publicUrl: entry.publicUrl,
        path: entry.path || null,
        isLoading: true,
        isAlbumCover: false,
        albumId: null,
        albumCount: 0
      };
    });
    commit(placeholders);

    void (async () => {
      /** @type {ResolvedExternalMediaItem[]} */
      const nextItems = [];
      /** @type {Array<{ publicUrl: string, albumId: string, start: number, count: number }>} */
      const albums = [];

      for (let index = 0; index < stored.length; index++) {
        const entry = stored[index];
        if (entry.type === 'album') {
          const albumId = `${originPrefix}-album-${index}`;
          const coverKey = `${albumId}-cover`;
          try {
            const album = await fetchYadiskPreview(entry.publicUrl, {
              signal: controller.signal
            });
            if (cancelled) return;
            if (album.type !== 'album' || !album.items?.length) {
              dropItem(coverKey);
              continue;
            }
            const start = nextItems.length;
            album.items.forEach((member, memberIndex) => {
              nextItems.push({
                filename: member.name || entry.name,
                url: '',
                thumbUrl: '',
                previewUrl: '',
                isVideo: member.mediaType === 'video',
                originKey: memberIndex === 0 ? coverKey : `${albumId}-${memberIndex}`,
                publicUrl: entry.publicUrl,
                path: member.path || null,
                isLoading: true,
                isAlbumCover: memberIndex === 0,
                albumId,
                albumCount: album.items?.length || 0
              });
            });
            albums.push({
              publicUrl: entry.publicUrl,
              albumId,
              start,
              count: album.items.length
            });
          } catch (err) {
            if (err?.name === 'AbortError' || cancelled) return;
            dropItem(coverKey);
          }
          continue;
        }

        nextItems.push({
          filename: entry.name,
          url: '',
          thumbUrl: '',
          previewUrl: '',
          isVideo: entry.mediaType === 'video',
          originKey: `${originPrefix}-ext-${index}`,
          publicUrl: entry.publicUrl,
          path: entry.path || null,
          isLoading: true,
          isAlbumCover: false,
          albumId: null,
          albumCount: 0
        });
      }

      if (cancelled) return;
      commit(nextItems);

      for (const album of albums) {
        const ctrl = createAlbumWindowController({
          publicUrl: album.publicUrl,
          getMembers: () =>
            working
              .filter((item) => item.albumId === album.albumId)
              .map((item) => ({
                originKey: item.originKey,
                path: item.path,
                name: item.filename,
                isVideo: item.isVideo
              })),
          signal: controller.signal,
          onResolved: (originKey, bytes) => {
            patchItem(originKey, {
              ...(bytes.name ? { filename: bytes.name } : {}),
              url: bytes.displayUrl,
              thumbUrl: bytes.previewUrl,
              previewUrl: bytes.previewUrl,
              isVideo: bytes.isVideo,
              isLoading: false
            });
          },
          onCleared: (originKey) => {
            patchItem(originKey, {
              url: '',
              thumbUrl: '',
              previewUrl: '',
              isLoading: true
            });
          },
          onError: () => {
            // слот остаётся shimmer; не выкидываем из альбома
          }
        });
        albumControllers.push(ctrl);

        const handler = (index, options) => {
          ctrl.setFocus(index, {
            radius:
              typeof options?.radius === 'number' ? options.radius : ALBUM_WINDOW_RADIUS,
            preferFull: options?.preferFull === true
          });
        };
        focusHandlersRef.current.set(album.publicUrl, handler);
        unsubs.push(registerAlbumLazyFocus(album.publicUrl, handler));
        ctrl.setFocus(0, { radius: ALBUM_COVER_RADIUS });
      }

      const singles = nextItems.filter((item) => !item.albumId);
      await Promise.all(
        singles.map((item) => resolveFileBytes(item, item.publicUrl, item.path))
      );
    })();

    return () => {
      cancelled = true;
      controller.abort();
      albumControllers.forEach((ctrl) => ctrl.destroy());
      unsubs.forEach((off) => off());
      focusHandlersRef.current.clear();
      objectUrls.forEach((url) => {
        if (!isSessionCachedBlobUrl(url)) URL.revokeObjectURL(url);
      });
    };
  }, [externalMedia, originPrefix]);

  return { items, setAlbumFocus };
}
