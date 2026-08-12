import { useCallback, useState } from 'react';

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
 *   albumViewerItems?: Array<{ key: string, url: string, name: string, isVideo: boolean }>
 * }>} items
 * @param {string} [keyPrefix]
 */
export function useLocalMediaFullscreen(items, keyPrefix = 'preview') {
  const [fullscreen, setFullscreen] = useState(
    /** @type {{ items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string }>, index: number, originRect: DOMRect | null, originKey: string } | null} */ (
      null
    )
  );
  const [hiddenMediaKey, setHiddenMediaKey] = useState(/** @type {string | null} */ (null));

  const openItem = useCallback(
    (item, _index, event) => {
      if (!item || !items.length) return;
      const originKey = `${keyPrefix}-${item.key}`;

      if (item.isAlbum && item.albumViewerItems?.length) {
        const viewerItems = item.albumViewerItems.map((entry) => ({
          filename: entry.name,
          url: entry.url,
          isVideo: entry.isVideo,
          originKey: `${keyPrefix}-${entry.key}`
        }));
        setFullscreen({
          items: viewerItems,
          index: 0,
          originRect: event?.currentTarget?.getBoundingClientRect?.() || null,
          originKey
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
        originKey
      });
    },
    [items, keyPrefix]
  );

  const close = useCallback(() => {
    setFullscreen(null);
    setHiddenMediaKey(null);
  }, []);

  return {
    openItem,
    fullscreen,
    close,
    hiddenMediaKey,
    onCloseStart: setHiddenMediaKey
  };
}
