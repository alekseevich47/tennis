import React, { memo } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';

/**
 * @param {{
 *   items: Array<{ key: string, url: string, name: string, isVideo: boolean }>,
 *   className?: string,
 *   showCaption?: boolean,
 *   originKeyPrefix?: string,
 *   hiddenMediaKey?: string | null,
 *   onItemClick?: (item: { key: string, url: string, name: string, isVideo: boolean }, index: number, event: React.MouseEvent) => void,
 *   getAction?: (item: { key: string, url: string, name: string, isVideo: boolean }) => React.ReactNode
 * }} props
 */
function MediaPreviewGrid({
  items,
  className,
  showCaption = true,
  originKeyPrefix = 'preview',
  hiddenMediaKey = null,
  onItemClick,
  getAction
}) {
  if (!items.length) return null;

  return (
    <div
      className={clsx('telegram-media-grid', `telegram-media-grid--${Math.min(items.length, 5)}`, className)}
    >
      {items.map((item, index) => {
        const originKey = `${originKeyPrefix}-${item.key}`;
        const media = item.isVideo ? (
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
        );

        return (
          <figure
            key={item.key}
            className={clsx(
              'telegram-media-item',
              hiddenMediaKey === originKey && 'is-returning-origin'
            )}
          >
            {onItemClick ? (
              <button
                type="button"
                className="telegram-media-item__open"
                data-media-origin-key={originKey}
                onClick={(event) => onItemClick(item, index, event)}
                aria-label={item.isVideo ? `Открыть видео ${item.name}` : `Открыть фото ${item.name}`}
              >
                {media}
              </button>
            ) : (
              media
            )}
            {showCaption ? <figcaption>{item.name}</figcaption> : null}
            {getAction?.(item)}
          </figure>
        );
      })}
    </div>
  );
}

export default memo(MediaPreviewGrid);
