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
            originKey: `${variant}-${post.id}-${index}`,
            isLoading: false
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
    if (!item?.url || item.isLoading) return;
    const readyItems = items.filter((entry) => entry.url && !entry.isLoading);
    const readyIndex = readyItems.findIndex((entry) => entry.originKey === item.originKey);
    if (readyIndex < 0) return;
    onOpenFullscreen?.(
      readyItems,
      readyIndex,
      event.currentTarget.getBoundingClientRect(),
      item.originKey
    );
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
        const pending = Boolean(item.isLoading) || (!item.url && !item.thumbUrl);

        if (item.isVideo) {
          if (pending) {
            return (
              <div
                key={item.originKey || item.filename}
                className="post-media-static post-media-pending"
                aria-label="Загрузка видео"
              >
                <span className="post-media-skeleton" aria-hidden="true" />
              </div>
            );
          }

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
            src={pending ? null : item.thumbUrl}
            previewSrc={pending ? null : item.previewUrl}
            alt={alt}
            className="telegram-post-media-item"
            loading={index === 0 ? 'eager' : 'lazy'}
            nativeAspect={singleNativeAspect}
            pending={pending}
            width={800}
            height={600}
          />
        );

        if (pending || !onOpenFullscreen) {
          return (
            <div
              key={item.originKey || item.filename}
              className={clsx('post-media-static', pending && 'post-media-pending')}
              aria-label={pending ? 'Загрузка изображения' : undefined}
            >
              {image}
            </div>
          );
        }

        return (
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
        );
      })}
    </div>
  );
}

export default memo(PostMedia);
