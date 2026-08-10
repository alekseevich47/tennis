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
 *   publicUrl: string
 * }} ResolvedExternalMediaItem
 */

/**
 * Резолв `posts.external_media` для сетки ленты через серверный прокси → blob URL.
 * Для фото: сначала preview (LQIP), затем file (резкое отображение / fullscreen).
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

    setItems(
      stored.map((entry, index) => ({
        filename: entry.name,
        url: '',
        thumbUrl: '',
        previewUrl: '',
        isVideo: entry.mediaType === 'video',
        originKey: `${originPrefix}-ext-${index}`,
        publicUrl: entry.publicUrl
      }))
    );

    stored.forEach(async (entry, index) => {
      const originKey = `${originPrefix}-ext-${index}`;
      try {
        const resolved = await fetchYadiskPreview(entry.publicUrl, {
          signal: controller.signal
        });
        if (cancelled) return;

        const isVideo = resolved.mediaType === 'video';
        const filename = resolved.name || entry.name;

        if (isVideo) {
          const objectUrl = track(
            await fetchYadiskObjectUrl(entry.publicUrl, 'file', {
              signal: controller.signal
            })
          );
          if (cancelled) return;
          const display = videoPreviewUrl(objectUrl);
          patchItem(originKey, {
            filename,
            url: display,
            thumbUrl: objectUrl,
            previewUrl: objectUrl,
            isVideo: true
          });
          return;
        }

        const previewObjectUrl = track(
          await fetchYadiskObjectUrl(entry.publicUrl, 'preview', {
            signal: controller.signal
          })
        );
        if (cancelled) return;

        patchItem(originKey, {
          filename,
          url: previewObjectUrl,
          thumbUrl: previewObjectUrl,
          previewUrl: previewObjectUrl,
          isVideo: false
        });

        try {
          const fileObjectUrl = track(
            await fetchYadiskObjectUrl(entry.publicUrl, 'file', {
              signal: controller.signal
            })
          );
          if (cancelled) return;
          patchItem(originKey, {
            filename,
            url: fileObjectUrl,
            thumbUrl: fileObjectUrl,
            previewUrl: previewObjectUrl,
            isVideo: false
          });
        } catch (fileErr) {
          if (fileErr?.name === 'AbortError' || cancelled) return;
        }
      } catch (err) {
        if (err?.name === 'AbortError' || cancelled) return;
        dropItem(originKey);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [externalMedia, originPrefix]);

  return items.filter((item) => Boolean(item.url || item.thumbUrl));
}
