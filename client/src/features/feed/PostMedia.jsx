import React, { memo } from 'react';
import clsx from 'clsx';
import { getMediaUrl, isVideoMediaName, mediaNames } from '../../lib/media';

/**
 * @param {{
 *   post: import('../../services/posts').PostRecord,
 *   variant?: 'card' | 'detail',
 *   onOpenFullscreen?: (url: string) => void
 * }} props
 */
function PostMedia({ post, variant = 'card', onOpenFullscreen }) {
  const items = mediaNames(post.media).flatMap((filename) => {
    const url = getMediaUrl(post, 'posts', filename);
    return url
      ? [{
        filename,
        url,
        isVideo: isVideoMediaName(filename)
      }]
      : [];
  });

  if (items.length === 0) return null;

  const count = Math.min(items.length, 5);

  return (
    <div
      className={clsx(
        'telegram-post-media-grid',
        `telegram-post-media-grid--${count}`,
        variant === 'detail' && 'telegram-post-media-grid--detail'
      )}
    >
      {items.map((item, index) => {
        const alt = `Медиа ${index + 1} к посту от ${post.created}`;

        if (item.isVideo) {
          return (
            <video
              key={item.filename}
              src={item.url}
              className="telegram-post-media-item"
              controls
              preload="metadata"
              playsInline
              aria-label={alt}
              width="800"
              height="600"
            />
          );
        }

        const image = (
          <img
            src={item.url}
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
            className="post-media-btn"
            onClick={() => onOpenFullscreen(item.url)}
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
