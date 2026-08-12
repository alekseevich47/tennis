// @ts-check
import { useEffect, useState } from 'react';
import { normalizeExternalMedia } from '../../lib/yadisk';
import { fetchYadiskObjectUrl, fetchYadiskPreview } from '../../services/yadisk';
import { videoPreviewUrl } from '../../lib/media';
import { setYadiskAlbumCache } from './yadiskAlbumCache';

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
        // Стабильный ключ между card/detail — по path внутри альбома.
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
 * Файл: preview (LQIP) → file. Альбом: сразу слот-обложка (shimmer), затем expand + байты.
 *
 * @param {unknown} externalMedia
 * @param {string} originPrefix
 * @returns {ResolvedExternalMediaItem[]}
 */
export function useResolvedExternalMedia(externalMedia, originPrefix) {
  const [items, setItems] = useState(/** @type {ResolvedExternalMediaItem[]} */ ([]));

  useEffect(() => {
    const stored = normalizeExternalMedia(externalMedia);
    if (!stored.length) {
      setItems([]);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    /** @type {string[]} */
    const objectUrls = [];
    /** @type {ResolvedExternalMediaItem[]} */
    let working = [];

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

        patchItem(originKey, {
          filename,
          url: previewObjectUrl,
          thumbUrl: previewObjectUrl,
          previewUrl: previewObjectUrl,
          isVideo: false,
          isLoading: false
        });

        try {
          const fileObjectUrl = track(
            await fetchYadiskObjectUrl(publicUrl, 'file', {
              signal: controller.signal,
              path: path || null
            })
          );
          if (cancelled) return;
          patchItem(originKey, {
            filename,
            url: fileObjectUrl,
            thumbUrl: fileObjectUrl,
            previewUrl: previewObjectUrl,
            isVideo: false,
            isLoading: false
          });
        } catch (fileErr) {
          if (fileErr?.name === 'AbortError' || cancelled) return;
        }
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

      // Все слоты параллельно — fullscreen сразу получает полный список из кэша.
      await Promise.all(
        nextItems.map((item) => resolveFileBytes(item, item.publicUrl, item.path))
      );
    })();

    return () => {
      cancelled = true;
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [externalMedia, originPrefix]);

  return items;
}
