import { useCallback, useEffect, useState } from 'react';
import { ALBUM_WINDOW_RADIUS } from './yadiskAlbumLazy';

/**
 * Fullscreen-просмотр локальных/blob-превью в модалках create/edit.
 * Для альбома — листает `albumViewerItems`, иначе всю сетку.
 *
 * @param {Array<{
 *   key: string,
 *   url: string,
 *   name: string,
 *   isVideo: boolean,
 *   isAlbum?: boolean,
 *   albumViewerItems?: Array<{ key: string, url: string, name: string, isVideo: boolean, status?: string }>
 * }>} items
 * @param {string} [keyPrefix]
 * @param {{
 *   onAlbumFocus?: (index: number, options?: { radius?: number }) => void
 * }} [options]
 */
export function useLocalMediaFullscreen(items, keyPrefix = 'preview', options = {}) {
  const { onAlbumFocus } = options;
  const [fullscreen, setFullscreen] = useState(
    /** @type {{ items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string, isLoading?: boolean }>, index: number, originRect: DOMRect | null, originKey: string, isAlbum?: boolean } | null} */ (
      null
    )
  );
  const [hiddenMediaKey, setHiddenMediaKey] = useState(/** @type {string | null} */ (null));

  const toAlbumViewerItems = useCallback(
    (albumItem) =>
      (albumItem.albumViewerItems || [])
        .filter((entry) => entry.url || entry.status === 'loading' || entry.status === 'ready')
        .map((entry) => ({
          filename: entry.name,
          url: entry.url || '',
          isVideo: entry.isVideo,
          originKey: `${keyPrefix}-${entry.key}`,
          isLoading: !entry.url
        })),
    [keyPrefix]
  );

  useEffect(() => {
    if (!fullscreen?.isAlbum) return;
    const albumItem = items.find((entry) => entry.isAlbum);
    if (!albumItem) return;
    const nextItems = toAlbumViewerItems(albumItem);
    if (!nextItems.length) return;
    setFullscreen((prev) => {
      if (!prev?.isAlbum) return prev;
      const currentKey = prev.items[prev.index]?.originKey;
      let nextIndex = Math.min(prev.index, nextItems.length - 1);
      if (currentKey) {
        const found = nextItems.findIndex((entry) => entry.originKey === currentKey);
        if (found >= 0) nextIndex = found;
      }
      return { ...prev, items: nextItems, index: Math.max(0, nextIndex) };
    });
  }, [items, fullscreen?.isAlbum, toAlbumViewerItems]);

  const openItem = useCallback(
    (item, index, event) => {
      if (!item || !items.length) return;
      const originKey = `${keyPrefix}-${item.key}`;

      if (item.isAlbum && item.albumViewerItems?.length) {
        const viewerItems = toAlbumViewerItems(item);
        if (!viewerItems.length) return;
        const startIndex = Math.max(0, Math.min(index || 0, viewerItems.length - 1));
        onAlbumFocus?.(startIndex, { radius: ALBUM_WINDOW_RADIUS });
        setFullscreen({
          items: viewerItems,
          index: startIndex,
          originRect: event?.currentTarget?.getBoundingClientRect?.() || null,
          originKey,
          isAlbum: true
        });
        return;
      }

      const viewerItems = items
        .filter((entry) => !entry.isAlbum && entry.url)
        .map((entry) => ({
          filename: entry.name,
          url: entry.url,
          isVideo: entry.isVideo,
          originKey: `${keyPrefix}-${entry.key}`
        }));
      const readyIndex = viewerItems.findIndex((entry) => entry.originKey === originKey);
      if (readyIndex < 0) return;
      setFullscreen({
        items: viewerItems,
        index: readyIndex,
        originRect: event?.currentTarget?.getBoundingClientRect?.() || null,
        originKey,
        isAlbum: false
      });
    },
    [items, keyPrefix, onAlbumFocus, toAlbumViewerItems]
  );

  const close = useCallback(() => {
    setFullscreen(null);
    setHiddenMediaKey(null);
  }, []);

  const handleActiveIndexChange = useCallback(
    (index) => {
      if (fullscreen?.isAlbum) {
        onAlbumFocus?.(index, { radius: ALBUM_WINDOW_RADIUS });
      }
      setFullscreen((prev) => (prev ? { ...prev, index } : prev));
    },
    [fullscreen?.isAlbum, onAlbumFocus]
  );

  const onCloseStart = useCallback((originKey) => {
    setHiddenMediaKey(originKey || null);
  }, []);

  return {
    openItem,
    fullscreen,
    close,
    hiddenMediaKey,
    setHiddenMediaKey,
    handleActiveIndexChange,
    onCloseStart
  };
}
