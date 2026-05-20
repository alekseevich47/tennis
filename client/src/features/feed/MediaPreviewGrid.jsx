import React, { memo } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';

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
            <div className="telegram-video-preview">
              <video
                src={videoPreviewUrl(item.url)}
                preload="metadata"
                playsInline
                muted
                disablePictureInPicture
                aria-label={item.name}
                width="800"
                height="600"
              />
              <span className="post-media-play-badge" aria-hidden="true">▶</span>
            </div>
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
