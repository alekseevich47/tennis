import React, { memo, useMemo } from 'react';
import clsx from 'clsx';
import {
  getMediaThumbUrl,
  getMediaUrl,
  isVideoMediaName,
  MEDIA_CARD_THUMB,
  MEDIA_LQIP_THUMB,
  mediaNames,
  videoPreviewUrl
} from '../../lib/media';
import ProgressiveImage from './ProgressiveImage';
import { useResolvedExternalMedia } from './useResolvedExternalMedia';

/**
 * @param {{
 *   post: { id: string, created?: string, media?: string | string[], external_media?: unknown },
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
  const fileItems = useMemo(
    () =>
      mediaNames(post.media).flatMap((filename, index) => {
        const url = getMediaUrl(post, collection, filename);
        const thumbUrl = getMediaThumbUrl(post, collection, filename, MEDIA_CARD_THUMB);
        const previewUrl = getMediaThumbUrl(post, collection, filename, MEDIA_LQIP_THUMB);
        return url
          ? [{
            filename,
            url,
            thumbUrl: thumbUrl || url,
            previewUrl: previewUrl || thumbUrl || url,
            isVideo: isVideoMediaName(filename),
            originKey: `${variant}-${post.id}-${index}`
          }]
          : [];
      }),
    [post, collection, variant]
  );

  const externalItems = useResolvedExternalMedia(
    post.external_media,
    `${variant}-${post.id}`
  );

  const items = useMemo(
    () => [...fileItems, ...externalItems].slice(0, 5),
    [fileItems, externalItems]
  );

  if (items.length === 0) return null;

  const count = Math.min(items.length, 5);
  const singleNativeAspect = count === 1 && !items[0]?.isVideo;
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
        singleNativeAspect && 'telegram-post-media-grid--native-aspect',
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
              <div key={item.originKey || item.filename} className="post-media-static">
                {video}
              </div>
            );
          }

          return (
            <button
              key={item.originKey || item.filename}
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
          <ProgressiveImage
            src={item.thumbUrl}
            previewSrc={item.previewUrl}
            alt={alt}
            className="telegram-post-media-item"
            loading={index === 0 ? 'eager' : 'lazy'}
            nativeAspect={singleNativeAspect}
            width={800}
            height={600}
          />
        );

        return onOpenFullscreen ? (
          <button
            key={item.originKey || item.filename}
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
          <div key={item.originKey || item.filename} className="post-media-static">
            {image}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PostMedia);
