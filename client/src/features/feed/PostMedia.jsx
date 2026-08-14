import React, { memo, useEffect, useMemo, useRef } from 'react';
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
import AlbumStackBadge from './AlbumStackBadge';
import MediaSwipeDots from './MediaSwipeDots';
import { useResolvedExternalMedia } from './useResolvedExternalMedia';
import { useSwipeGallery } from './useSwipeGallery';
import { getYadiskAlbumCache, toFullscreenAlbumItems } from './yadiskAlbumCache';
import { ALBUM_COVER_RADIUS, ALBUM_WINDOW_RADIUS } from './yadiskAlbumLazy';

/**
 * @param {{
 *   post: { id: string, created?: string, media?: string | string[], external_media?: unknown },
 *   collection?: string,
 *   variant?: 'card' | 'detail',
 *   className?: string,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (
 *     items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string, isLoading?: boolean }>,
 *     index: number,
 *     originRect?: DOMRect,
 *     originKey?: string,
 *     meta?: { albumPublicUrl?: string }
 *   ) => void
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
            isLoading: false,
            isAlbumCover: false,
            albumId: null,
            albumCount: 0,
            publicUrl: '',
            path: null
          }]
          : [];
      }),
    [post, collection, variant]
  );

  const { items: externalItems, setAlbumFocus } = useResolvedExternalMedia(
    post.external_media,
    `${variant}-${post.id}`
  );

  const albumId = useMemo(
    () => externalItems.find((item) => item.albumId)?.albumId || null,
    [externalItems]
  );

  const albumItems = useMemo(
    () => (albumId ? externalItems.filter((item) => item.albumId === albumId) : []),
    [albumId, externalItems]
  );

  const isAlbum = Boolean(albumId && albumItems.length > 0);
  const albumPublicUrl = albumItems[0]?.publicUrl || '';

  const {
    index: albumIndex,
    setIndex: setAlbumIndex,
    handleTouchStart,
    handleTouchEnd,
    consumeSuppressClick
  } = useSwipeGallery(isAlbum ? albumItems.length : 0, `${post.id}-${albumId || ''}`);

  const albumExpandedRef = useRef(false);

  useEffect(() => {
    albumExpandedRef.current = false;
  }, [albumPublicUrl]);

  useEffect(() => {
    if (!isAlbum || !albumPublicUrl) return;
    if (albumIndex !== 0) albumExpandedRef.current = true;
    setAlbumFocus(albumPublicUrl, albumIndex, {
      radius: albumExpandedRef.current ? ALBUM_WINDOW_RADIUS : ALBUM_COVER_RADIUS,
      preferFull: albumExpandedRef.current
    });
  }, [isAlbum, albumPublicUrl, albumIndex, setAlbumFocus]);

  const items = useMemo(() => {
    if (isAlbum) {
      const active = albumItems[albumIndex] || albumItems[0];
      return active ? [active] : [];
    }
    return [...fileItems, ...externalItems.filter((item) => !item.albumId)].slice(0, 5);
  }, [isAlbum, albumItems, albumIndex, fileItems, externalItems]);

  if (items.length === 0) return null;

  const count = Math.min(items.length, 5);
  const singleNativeAspect = count === 1 && !items[0]?.isVideo && !isAlbum;

  const openFullscreen = (event, index) => {
    event.stopPropagation();
    if (consumeSuppressClick()) return;

    const item = items[index];
    if (!item?.url || item.isLoading) return;

    if (isAlbum && albumPublicUrl) {
      const cached = getYadiskAlbumCache(albumPublicUrl);
      const source =
        cached && cached.length > 0
          ? cached
          : albumItems.length > 0
            ? albumItems
            : [item];
      const viewerItems = toFullscreenAlbumItems(source);
      if (!viewerItems.length) return;
      const targetKey = item.path || `${albumPublicUrl}::0`;
      const foundIndex = viewerItems.findIndex(
        (entry) =>
          entry.originKey === targetKey ||
          entry.originKey === item.originKey ||
          (item.path != null && entry.originKey === item.path)
      );
      const openIndex = foundIndex >= 0 ? foundIndex : albumIndex;
      albumExpandedRef.current = true;
      setAlbumFocus(albumPublicUrl, openIndex, {
        radius: ALBUM_WINDOW_RADIUS,
        preferFull: true
      });
      onOpenFullscreen?.(
        viewerItems,
        openIndex,
        event.currentTarget.getBoundingClientRect(),
        item.originKey,
        { albumPublicUrl }
      );
      return;
    }

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
        isAlbum && 'telegram-post-media-grid--album',
        variant === 'detail' && 'telegram-post-media-grid--detail',
        className
      )}
    >
      {items.map((item, index) => {
        const alt = `Медиа ${index + 1} к посту от ${post.created}`;
        const pending = Boolean(item.isLoading) || (!item.url && !item.thumbUrl);
        const showAlbumBadge = isAlbum;

        const swipeProps = isAlbum
          ? {
              onTouchStart: handleTouchStart,
              onTouchEnd: handleTouchEnd
            }
          : {};

        if (item.isVideo) {
          if (pending) {
            return (
              <div
                key={item.originKey || item.filename}
                className="post-media-static post-media-pending"
                aria-label="Загрузка видео"
              >
                <div className="media-frame">
                  <span className="post-media-skeleton" aria-hidden="true" />
                  {showAlbumBadge ? <AlbumStackBadge /> : null}
                  {isAlbum ? (
                    <MediaSwipeDots
                      count={albumItems.length}
                      activeIndex={albumIndex}
                      onSelect={setAlbumIndex}
                    />
                  ) : null}
                </div>
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
              <div
                key={item.originKey || item.filename}
                className="post-media-static"
                {...swipeProps}
              >
                <div className="media-frame">
                  {video}
                  <span className="post-media-play-badge" aria-hidden="true">▶</span>
                  {showAlbumBadge ? <AlbumStackBadge /> : null}
                  {isAlbum ? (
                    <MediaSwipeDots
                      count={albumItems.length}
                      activeIndex={albumIndex}
                      onSelect={setAlbumIndex}
                    />
                  ) : null}
                </div>
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
              {...swipeProps}
              aria-label={
                showAlbumBadge
                  ? `Открыть альбом на весь экран`
                  : `Открыть видео ${index + 1} на весь экран`
              }
            >
              <div className="media-frame">
                {video}
                <span className="post-media-play-badge" aria-hidden="true">▶</span>
                {showAlbumBadge ? <AlbumStackBadge /> : null}
                {isAlbum ? (
                  <MediaSwipeDots
                    count={albumItems.length}
                    activeIndex={albumIndex}
                    onSelect={setAlbumIndex}
                  />
                ) : null}
              </div>
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
              {...swipeProps}
            >
              <div className="media-frame">
                {image}
                {showAlbumBadge ? <AlbumStackBadge /> : null}
                {isAlbum ? (
                  <MediaSwipeDots
                    count={albumItems.length}
                    activeIndex={albumIndex}
                    onSelect={setAlbumIndex}
                  />
                ) : null}
              </div>
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
            {...swipeProps}
            aria-label={
              showAlbumBadge
                ? 'Открыть альбом на весь экран'
                : `Открыть медиа ${index + 1} на весь экран`
            }
          >
            <div className="media-frame">
              {image}
              {showAlbumBadge ? <AlbumStackBadge /> : null}
              {isAlbum ? (
                <MediaSwipeDots
                  count={albumItems.length}
                  activeIndex={albumIndex}
                  onSelect={setAlbumIndex}
                />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default memo(PostMedia);
