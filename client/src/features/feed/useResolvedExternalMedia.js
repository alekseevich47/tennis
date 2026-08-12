// @ts-check
import { useEffect, useState } from 'react';
import { normalizeExternalMedia } from '../../lib/yadisk';
import { fetchYadiskObjectUrl, fetchYadiskPreview } from '../../services/yadisk';
import { videoPreviewUrl } from '../../lib/media';

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
 * Резолв `posts.external_media` для сетки ленты через серверный прокси → blob URL.
 * Файл: preview (LQIP) → file. Альбом: одна запись в storage → все файлы при просмотре;
 * в карточке — только обложка (`isAlbumCover`) + `albumCount`.
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

    const track = (url) => {
      objectUrls.push(url);
      return url;
    };

    /**
     * @param {string} originKey
     * @param {Partial<ResolvedExternalMediaItem>} patch
     */
    const patchItem = (originKey, patch) => {
      if (cancelled) return;
      setItems((current) =>
        current.map((item) => (item.originKey === originKey ? { ...item, ...patch } : item))
      );
    };

    /**
     * @param {string} originKey
     */
    const dropItem = (originKey) => {
      if (cancelled) return;
      setItems((current) => current.filter((item) => item.originKey !== originKey));
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

    void (async () => {
      /** @type {ResolvedExternalMediaItem[]} */
      const nextItems = [];

      for (let index = 0; index < stored.length; index++) {
        const entry = stored[index];
        if (entry.type === 'album') {
          try {
            const album = await fetchYadiskPreview(entry.publicUrl, {
              signal: controller.signal
            });
            if (cancelled) return;
            if (album.type !== 'album' || !album.items?.length) {
              continue;
            }
            const albumId = `${originPrefix}-album-${index}`;
            album.items.forEach((member, memberIndex) => {
              nextItems.push({
                filename: member.name || entry.name,
                url: '',
                thumbUrl: '',
                previewUrl: '',
                isVideo: member.mediaType === 'video',
                originKey: `${albumId}-${memberIndex}`,
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
      setItems(nextItems);

      // Обложки альбомов и одиночные — сразу; остальные файлы альбома — следом (blur preview).
      const priority = nextItems.filter((item) => !item.albumId || item.isAlbumCover);
      const rest = nextItems.filter((item) => item.albumId && !item.isAlbumCover);

      for (const item of priority) {
        if (cancelled) return;
        await resolveFileBytes(item, item.publicUrl, item.path);
      }
      for (const item of rest) {
        if (cancelled) return;
        // Не блокируем очередь на каждом файле полностью — параллелим умеренно
        void resolveFileBytes(item, item.publicUrl, item.path);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [externalMedia, originPrefix]);

  return items;
}
