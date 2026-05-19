import React, { memo } from 'react';
import { getMediaUrl, firstFileName } from '../../lib/media';

/**
 * @param {{
 *   post: import('../../services/posts').PostRecord,
 *   variant?: 'card' | 'detail',
 *   onOpenFullscreen?: (url: string) => void
 * }} props
 */
function PostMedia({ post, variant = 'card', onOpenFullscreen }) {
  const filename = firstFileName(post.media);
  if (!filename) return null;

  const url = getMediaUrl(post, 'posts', filename);
  if (!url) return null;

  const className = variant === 'detail' ? 'post-media-img-detail' : 'post-media-img clickable';

  if (variant === 'detail') {
    return <img src={url} alt={`Медиа поста от ${post.created}`} className={className} />;
  }

  return (
    <button
      type="button"
      className="post-media-btn"
      onClick={() => onOpenFullscreen?.(url)}
      aria-label="Открыть фото на весь экран"
    >
      <img src={url} alt={`Медиа поста от ${post.created}`} className={className} />
    </button>
  );
}

export default memo(PostMedia);
