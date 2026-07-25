import { useCallback, useState } from 'react';

/**
 * Fullscreen-просмотр локальных/blob-превью в модалках create/edit.
 *
 * @param {Array<{ key: string, url: string, name: string, isVideo: boolean }>} items
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
    (item, index, event) => {
      if (!item || !items.length) return;
      const viewerItems = items.map((entry) => ({
        filename: entry.name,
        url: entry.url,
        isVideo: entry.isVideo,
        originKey: `${keyPrefix}-${entry.key}`
      }));
      const originKey = `${keyPrefix}-${item.key}`;
      setFullscreen({
        items: viewerItems,
        index,
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
