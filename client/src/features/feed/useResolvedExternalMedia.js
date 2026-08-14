// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeExternalMedia } from '../../lib/yadisk';
import { fetchYadiskPreview } from '../../services/yadisk';
import { setYadiskAlbumCache } from './yadiskAlbumCache';
import { getCachedMemberBytes } from './yadiskMediaSessionCache';
import {
  ALBUM_PREVIEW_ALL_RADIUS,
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
 *   isUpgrading?: boolean,
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
        isLoading: entry.isLoading,
        isUpgrading: entry.isUpgrading
      }))
    );
  });
}

/**
 * Резолв `posts.external_media` для сетки ленты через серверный прокси → blob URL.
 * Альбом и одиночные: все L-preview сразу; оригинал (`preferFull`) при viewport/fullscreen.
 *
 * @param {unknown} externalMedia
 * @param {string} originPrefix
 * @returns {{
 *   items: ResolvedExternalMediaItem[],
 *   setAlbumFocus: (publicUrl: string, index: number, options?: { radius?: number, preferFull?: boolean }) => void,
 *   setPreferFull: (enabled: boolean) => void
 * }}
 */
export function useResolvedExternalMedia(externalMedia, originPrefix) {
  const [items, setItems] = useState(/** @type {ResolvedExternalMediaItem[]} */ ([]));
  const focusHandlersRef = useRef(
    /** @type {Map<string, (index: number, options?: { radius?: number }) => void>} */ (new Map())
  );

  const preferFullRef = useRef(false);

  const setAlbumFocus = useCallback((publicUrl, index, options) => {
    focusHandlersRef.current.get(publicUrl)?.(index, options);
    requestAlbumLazyFocus(publicUrl, index, options);
  }, []);

  const setPreferFull = useCallback((enabled) => {
    preferFullRef.current = Boolean(enabled);
    focusHandlersRef.current.forEach((handler) => {
      handler(0, { preferFull: Boolean(enabled), keepIndex: true });
    });
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
    /** @type {ResolvedExternalMediaItem[]} */
    let working = [];
    /** @type {Array<{ destroy: () => void }>} */
    const albumControllers = [];
    /** @type {Array<() => void>} */
    const unsubs = [];

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
     * @param {import('./yadiskMediaSessionCache').CachedMemberBytes} bytes
     */
    const patchFromBytes = (originKey, bytes) => {
      const preview = bytes.previewUrl;
      const original =
        bytes.fileUrl && bytes.fileUrl !== bytes.previewUrl ? bytes.fileUrl : null;
      patchItem(originKey, {
        ...(bytes.name ? { filename: bytes.name } : {}),
        url: original || preview,
        thumbUrl: preview,
        previewUrl: preview,
        isVideo: bytes.isVideo,
        isLoading: false,
        isUpgrading: !bytes.isVideo && bytes.fileUrl == null
      });
    };

    /**
     * @param {ResolvedExternalMediaItem} item
     * @returns {ResolvedExternalMediaItem}
     */
    const withCache = (item) => {
      if (!item.publicUrl) return item;
      const cached = getCachedMemberBytes(item.publicUrl, item.path);
      if (!cached) return item;
      const preview = cached.previewUrl;
      const original =
        cached.fileUrl && cached.fileUrl !== cached.previewUrl ? cached.fileUrl : null;
      return {
        ...item,
        filename: cached.name || item.filename,
        url: original || preview,
        thumbUrl: preview,
        previewUrl: preview,
        isVideo: cached.isVideo,
        isLoading: false,
        isUpgrading: !cached.isVideo && cached.fileUrl == null
      };
    };

    /** @type {ResolvedExternalMediaItem[]} */
    const placeholders = stored.map((entry, index) => {
      if (entry.type === 'album') {
        const albumId = `${originPrefix}-album-${index}`;
        return withCache({
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
        });
      }
      return withCache({
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
              nextItems.push(
                withCache({
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
                })
              );
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

        nextItems.push(
          withCache({
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
          })
        );
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
            patchFromBytes(originKey, bytes);
          },
          onCleared: (originKey) => {
            patchItem(originKey, {
              url: '',
              thumbUrl: '',
              previewUrl: '',
              isLoading: true,
              isUpgrading: false
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
              typeof options?.radius === 'number' ? options.radius : ALBUM_PREVIEW_ALL_RADIUS,
            preferFull:
              typeof options?.preferFull === 'boolean'
                ? options.preferFull
                : preferFullRef.current,
            keepIndex: options?.keepIndex === true
          });
        };
        focusHandlersRef.current.set(album.publicUrl, handler);
        unsubs.push(registerAlbumLazyFocus(album.publicUrl, handler));
        ctrl.setFocus(0, {
          radius: ALBUM_PREVIEW_ALL_RADIUS,
          preferFull: preferFullRef.current
        });
      }

      const singles = nextItems.filter((item) => !item.albumId);
      if (singles.length > 0) {
        const singlesKey = `${originPrefix}::singles`;
        const ctrl = createAlbumWindowController({
          publicUrl: singlesKey,
          getMembers: () =>
            working
              .filter((item) => !item.albumId)
              .map((item) => ({
                originKey: item.originKey,
                path: item.path,
                name: item.filename,
                isVideo: item.isVideo,
                publicUrl: item.publicUrl
              })),
          signal: controller.signal,
          onResolved: (originKey, bytes) => {
            patchFromBytes(originKey, bytes);
          },
          onCleared: (originKey) => {
            patchItem(originKey, {
              url: '',
              thumbUrl: '',
              previewUrl: '',
              isLoading: true,
              isUpgrading: false
            });
          },
          onError: () => {}
        });
        albumControllers.push(ctrl);
        const handler = (index, options) => {
          ctrl.setFocus(index, {
            radius: ALBUM_PREVIEW_ALL_RADIUS,
            preferFull:
              typeof options?.preferFull === 'boolean'
                ? options.preferFull
                : preferFullRef.current,
            keepIndex: options?.keepIndex === true
          });
        };
        focusHandlersRef.current.set(singlesKey, handler);
        ctrl.setFocus(0, {
          radius: ALBUM_PREVIEW_ALL_RADIUS,
          preferFull: preferFullRef.current
        });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      albumControllers.forEach((ctrl) => ctrl.destroy());
      unsubs.forEach((off) => off());
      focusHandlersRef.current.clear();
    };
  }, [externalMedia, originPrefix]);

  return { items, setAlbumFocus, setPreferFull };
}
