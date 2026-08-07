// @ts-check
import { useEffect, useState } from 'react';
import { normalizeExternalMedia } from '../../lib/yadisk';
import { fetchYadiskPreview } from '../../services/yadisk';

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
 * Резолв `posts.external_media` для сетки ленты (с кешем в state на жизнь карточки).
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

    Promise.all(
      stored.map(async (entry, index) => {
        try {
          const resolved = await fetchYadiskPreview(entry.publicUrl, {
            signal: controller.signal
          });
          const isVideo = resolved.mediaType === 'video';
          const fileUrl = resolved.fileUrl || '';
          const previewUrl = resolved.previewUrl || fileUrl;
          const url = isVideo ? fileUrl : previewUrl;
          if (!url) return null;
          return {
            filename: resolved.name || entry.name,
            url,
            thumbUrl: previewUrl || url,
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
      if (cancelled) return;
      setItems(results.filter(Boolean));
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [externalMedia, originPrefix]);

  return items;
}
