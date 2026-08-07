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
 *   isVideo: boolean,
 *   originKey: string,
 *   publicUrl: string
 * }} ResolvedExternalMediaItem
 */

/**
 * Резолв `posts.external_media` для сетки ленты через серверный прокси → blob URL.
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

    Promise.all(
      stored.map(async (entry, index) => {
        try {
          const resolved = await fetchYadiskPreview(entry.publicUrl, {
            signal: controller.signal
          });
          const isVideo = resolved.mediaType === 'video';
          const kind = isVideo ? 'file' : 'preview';
          const objectUrl = await fetchYadiskObjectUrl(entry.publicUrl, kind, {
            signal: controller.signal
          });
          objectUrls.push(objectUrl);
          return {
            filename: resolved.name || entry.name,
            url: isVideo ? videoPreviewUrl(objectUrl) : objectUrl,
            thumbUrl: objectUrl,
            isVideo,
            originKey: `${originPrefix}-ext-${index}`,
            publicUrl: entry.publicUrl
          };
        } catch (err) {
          if (err?.name === 'AbortError') return null;
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setItems(results.filter(Boolean));
    });

    return () => {
      cancelled = true;
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [externalMedia, originPrefix]);

  return items;
}
