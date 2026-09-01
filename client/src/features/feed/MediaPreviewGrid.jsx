import React, { memo, useEffect } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';
import AlbumStackBadge from './AlbumStackBadge';
import MediaSwipeDots from './MediaSwipeDots';
import ProgressiveImage from './ProgressiveImage';
import FeedVideoPreview from './FeedVideoPreview';
import { useSwipeGallery } from './useSwipeGallery';

/**
 * @param {{
 *   item: {
 *     key: string,
 *     url: string,
 *     name: string,
 *     isVideo: boolean,
 *     status?: 'loading' | 'ready' | 'error',
 *     error?: string,
 *     isAlbum?: boolean,
 *     albumViewerItems?: Array<{
 *       key: string,
 *       url: string,
 *       name: string,
 *       isVideo: boolean,
 *       status?: string
 *     }>
 *   },
 *   originKey: string,
 *   hiddenMediaKey?: string | null,
 *   showCaption?: boolean,
 *   onItemClick?: (item: any, index: number, event: React.MouseEvent) => void,
 *   onAlbumIndexChange?: (item: any, index: number) => void,
 *   gridIndex: number,
 *   getAction?: (item: any) => React.ReactNode
 * }} props
 */
function MediaPreviewAlbumItem({
  item,
  originKey,
  hiddenMediaKey,
  showCaption,
  onItemClick,
  onAlbumIndexChange,
  getAction
}) {
  const slides = item.albumViewerItems?.length
    ? item.albumViewerItems
    : [
        {
          key: item.key,
          url: item.url,
          name: item.name,
          isVideo: item.isVideo,
          status: item.status
        }
      ];

  const {
    index,
    setIndex,
    handleTouchStart,
    handleTouchEnd,
    consumeSuppressClick
  } = useSwipeGallery(slides.length, item.key);

  useEffect(() => {
    onAlbumIndexChange?.(item, index);
    // Только индекс/ключ — не на каждый байт url.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- item.url меняется часто
  }, [index, item.key]);

  const active = slides[index] || slides[0];
  const status = active?.status || item.status || (active?.url ? 'ready' : 'loading');

  let media;
  if (status === 'loading' || (!active?.url && status !== 'error')) {
    media = (
      <div className="telegram-media-item__skeleton" aria-label="Загрузка превью">
        <span className="post-media-skeleton" aria-hidden="true" />
      </div>
    );
  } else if (status === 'error' || !active?.url) {
    media = (
      <div className="telegram-media-item__state telegram-media-item__state--error" role="alert">
        {item.error || 'Ошибка'}
      </div>
    );
  } else if (active.isVideo) {
    media = (
      <div className="telegram-video-preview">
        <video
          src={videoPreviewUrl(active.url)}
          preload="metadata"
          playsInline
          muted
          disablePictureInPicture
          aria-label={active.name}
          width="800"
          height="600"
        />
        <span className="post-media-play-badge" aria-hidden="true">▶</span>
      </div>
    );
  } else {
    media = <img src={active.url} alt={active.name} loading="lazy" width="800" height="600" />;
  }

  const canOpen = Boolean(onItemClick) && Boolean(active?.url) && status !== 'error';

  const handleOpen = (event) => {
    if (consumeSuppressClick()) return;
    // Для альбома второй аргумент — индекс слайда внутри альбома.
    onItemClick?.(item, index, event);
  };

  const frame = (
    <div className="media-frame">
      {media}
      <AlbumStackBadge />
      <MediaSwipeDots count={slides.length} activeIndex={index} onSelect={setIndex} />
    </div>
  );

  return (
    <figure
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
          onClick={handleOpen}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label={`Открыть альбом ${item.name}`}
        >
          {frame}
        </button>
      ) : (
        <div
          className="telegram-media-item__open"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {frame}
        </div>
      )}
      {showCaption ? <figcaption>{item.name}</figcaption> : null}
      {getAction?.(item)}
    </figure>
  );
}

/**
 * @param {{
 *   items: Array<{
 *     key: string,
 *     url: string,
 *     name: string,
 *     isVideo: boolean,
 *     status?: 'loading' | 'ready' | 'error',
 *     error?: string,
 *     isAlbum?: boolean,
 *     albumCount?: number,
 *     albumViewerItems?: Array<{ key: string, url: string, name: string, isVideo: boolean, status?: string }>
 *   }>,
 *   className?: string,
 *   showCaption?: boolean,
 *   originKeyPrefix?: string,
 *   hiddenMediaKey?: string | null,
 *   onItemClick?: (item: any, index: number, event: React.MouseEvent) => void,
 *   onAlbumIndexChange?: (item: any, index: number) => void,
 *   progressive?: boolean,
 *   getAction?: (item: any) => React.ReactNode
 * }} props
 */
function MediaPreviewGrid({
  items,
  className,
  showCaption = true,
  originKeyPrefix = 'preview',
  hiddenMediaKey = null,
  onItemClick,
  onAlbumIndexChange,
  progressive = false,
  getAction
}) {
  if (!items.length) return null;

  const renderPhotoMedia = (item) => {
    if (progressive) {
      return (
        <ProgressiveImage
          src={item.url}
          previewSrc={item.previewUrl || item.url}
          alt={item.name}
          className="telegram-post-media-item"
          loading="lazy"
          width="800"
          height="600"
        />
      );
    }
    return <img src={item.url} alt={item.name} loading="lazy" width="800" height="600" />;
  };

  const renderVideoMedia = (item) => {
    if (progressive) {
      return (
        <FeedVideoPreview
          src={item.fullUrl || item.url}
          poster={item.previewUrl || item.url}
          active={false}
          alt={item.name}
          className="telegram-post-media-item"
        />
      );
    }
    return (
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
  };

  return (
    <div
      className={clsx('telegram-media-grid', `telegram-media-grid--${Math.min(items.length, 5)}`, className)}
    >
      {items.map((item, index) => {
        const originKey = `${originKeyPrefix}-${item.key}`;

        if (item.isAlbum) {
          return (
            <MediaPreviewAlbumItem
              key={item.key}
              item={item}
              originKey={originKey}
              hiddenMediaKey={hiddenMediaKey}
              showCaption={showCaption}
              onItemClick={onItemClick}
              onAlbumIndexChange={onAlbumIndexChange}
              getAction={getAction}
            />
          );
        }

        const status = item.status || 'ready';
        let media;
        if (status === 'loading') {
          media = (
            <div className="telegram-media-item__skeleton" aria-label="Загрузка превью">
              <span className="post-media-skeleton" aria-hidden="true" />
            </div>
          );
        } else if (status === 'error' || !item.url) {
          media = (
            <div className="telegram-media-item__state telegram-media-item__state--error" role="alert">
              {item.error || 'Ошибка'}
            </div>
          );
        } else if (item.isVideo) {
          media = renderVideoMedia(item);
        } else {
          media = renderPhotoMedia(item);
        }

        const canOpen = Boolean(onItemClick) && status === 'ready' && Boolean(item.url);

        const frame = <div className="media-frame">{media}</div>;

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
                aria-label={
                  item.isVideo ? `Открыть видео ${item.name}` : `Открыть фото ${item.name}`
                }
              >
                {frame}
              </button>
            ) : (
              frame
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
