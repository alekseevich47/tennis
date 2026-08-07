import React, { memo } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';

/**
 * @param {{
 *   items: Array<{ key: string, url: string, name: string, isVideo: boolean, status?: 'loading' | 'ready' | 'error', error?: string }>,
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
        const status = item.status || 'ready';
        let media;
        if (status === 'loading') {
          media = (
            <div className="telegram-media-item__state" aria-label="Загрузка превью">
              <span className="telegram-media-item__spinner" aria-hidden="true" />
            </div>
          );
        } else if (status === 'error' || !item.url) {
          media = (
            <div className="telegram-media-item__state telegram-media-item__state--error" role="alert">
              {item.error || 'Ошибка'}
            </div>
          );
        } else if (item.isVideo) {
          media = (
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
          );
        } else {
          media = <img src={item.url} alt={item.name} loading="lazy" width="800" height="600" />;
        }

        const canOpen = Boolean(onItemClick) && status === 'ready' && Boolean(item.url);

        return (
          <figure
            key={item.key}
            className={clsx(
              'telegram-media-item',
              hiddenMediaKey === originKey && 'is-returning-origin'
            )}
          >
            {canOpen ? (
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
