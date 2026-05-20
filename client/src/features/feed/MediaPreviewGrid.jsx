import React, { memo } from 'react';
import clsx from 'clsx';

/**
 * @param {{
 *   items: Array<{ key: string, url: string, name: string, isVideo: boolean }>,
 *   className?: string,
 *   getAction?: (item: { key: string, url: string, name: string, isVideo: boolean }) => React.ReactNode
 * }} props
 */
function MediaPreviewGrid({ items, className, getAction }) {
  if (!items.length) return null;

  return (
    <div
      className={clsx('telegram-media-grid', `telegram-media-grid--${Math.min(items.length, 5)}`, className)}
    >
      {items.map((item) => (
        <figure key={item.key} className="telegram-media-item">
          {item.isVideo ? (
            <video
              src={item.url}
              controls
              preload="metadata"
              playsInline
              aria-label={item.name}
              width="800"
              height="600"
            />
          ) : (
            <img src={item.url} alt={item.name} loading="lazy" width="800" height="600" />
          )}
          <figcaption>{item.name}</figcaption>
          {getAction?.(item)}
        </figure>
      ))}
    </div>
  );
}

export default memo(MediaPreviewGrid);
