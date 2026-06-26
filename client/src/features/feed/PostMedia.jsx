import React, { memo } from 'react';
import clsx from 'clsx';
import { getMediaThumbUrl, getMediaUrl, isVideoMediaName, mediaNames, videoPreviewUrl } from '../../lib/media';

/**
 * @param {{
 *   post: { id: string, created?: string, media?: string | string[] },
 *   collection?: string,
 *   variant?: 'card' | 'detail',
 *   className?: string,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function PostMedia({
  post,
  collection = 'posts',
  variant = 'card',
  className,
  hiddenMediaKey = null,
  onOpenFullscreen
}) {
  const items = mediaNames(post.media).flatMap((filename, index) => {
    const url = getMediaUrl(post, collection, filename);
    const thumbUrl = getMediaThumbUrl(post, collection, filename, '800x0');
    return url
      ? [{
        filename,
        url,
        thumbUrl: thumbUrl || url,
        isVideo: isVideoMediaName(filename),
        originKey: `${variant}-${post.id}-${index}`
      }]
      : [];
  });

  if (items.length === 0) return null;

  const count = Math.min(items.length, 5);
  const openFullscreen = (event, index) => {
    event.stopPropagation();
    const item = items[index];
    onOpenFullscreen?.(items, index, event.currentTarget.getBoundingClientRect(), item?.originKey);
  };

  return (
    <div
      className={clsx(
        'telegram-post-media-grid',
        `telegram-post-media-grid--${count}`,
        variant === 'detail' && 'telegram-post-media-grid--detail',
        className
      )}
    >
      {items.map((item, index) => {
        const alt = `Медиа ${index + 1} к посту от ${post.created}`;

        if (item.isVideo) {
          const video = (
            <video
              src={videoPreviewUrl(item.url)}
              className="telegram-post-media-item"
              preload="metadata"
              playsInline
              muted
              disablePictureInPicture
              aria-label={alt}
              width="800"
              height="600"
            />
          );

          if (!onOpenFullscreen) {
            return (
              <div key={item.filename} className="post-media-static">
                {video}
              </div>
            );
          }

          return (
            <button
              key={item.filename}
              type="button"
              className={clsx(
                'post-media-btn post-media-video-btn',
                hiddenMediaKey === item.originKey && 'is-returning-origin'
              )}
              data-media-origin-key={item.originKey}
              onClick={(event) => openFullscreen(event, index)}
              aria-label={`Открыть видео ${index + 1} на весь экран`}
            >
              {video}
              <span className="post-media-play-badge" aria-hidden="true">▶</span>
            </button>
          );
        }

        const image = (
          <img
            src={item.thumbUrl}
            alt={alt}
            className="telegram-post-media-item"
            loading={index === 0 ? 'eager' : 'lazy'}
            width="800"
            height="600"
          />
        );

        return onOpenFullscreen ? (
          <button
            key={item.filename}
            type="button"
            className={clsx(
              'post-media-btn',
              hiddenMediaKey === item.originKey && 'is-returning-origin'
            )}
            data-media-origin-key={item.originKey}
            onClick={(event) => openFullscreen(event, index)}
            aria-label={`Открыть медиа ${index + 1} на весь экран`}
          >
            {image}
          </button>
        ) : (
          <div key={item.filename} className="post-media-static">
            {image}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PostMedia);
