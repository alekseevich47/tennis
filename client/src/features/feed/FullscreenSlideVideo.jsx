import React, { Suspense, lazy, useCallback, useEffect } from 'react';

const FullscreenVjsPlayer = lazy(() => import('./FullscreenVjsPlayer'));

/**
 * Fullscreen-видео — только Video.js v10 Default.
 *
 * @param {{
 *   item: { url?: string, previewUrl?: string, thumbUrl?: string },
 *   isActiveSlide: boolean,
 *   mediaRef: React.MutableRefObject<HTMLImageElement | HTMLVideoElement | null>,
 *   onActiveVideoRef?: (el: HTMLVideoElement | null) => void,
 *   isClosing: boolean,
 *   isActiveSlideClosing: boolean,
 *   returnTransform: string | null,
 *   position: { x: number, y: number },
 *   activeIndex: number,
 *   onClose: () => void
 * }} props
 */
function FullscreenSlideVideo({
  item,
  isActiveSlide,
  mediaRef,
  onActiveVideoRef,
  isClosing,
  isActiveSlideClosing,
  returnTransform,
  position,
  activeIndex,
  onClose
}) {
  const videoSrc = item.url || '';
  const poster = item.thumbUrl || item.previewUrl || '';
  const shouldMount = isActiveSlide && !isClosing && Boolean(videoSrc);

  useEffect(() => {
    if (shouldMount) return undefined;
    if (isActiveSlide) {
      mediaRef.current = null;
      onActiveVideoRef?.(null);
    }
    return undefined;
  }, [shouldMount, isActiveSlide, mediaRef, onActiveVideoRef]);

  const attachVideoRef = useCallback(
    (el) => {
      if (!shouldMount || !el) return;
      mediaRef.current = el;
      onActiveVideoRef?.(el);
    },
    [shouldMount, mediaRef, onActiveVideoRef]
  );

  if (!isActiveSlide) {
    return (
      <div className="fullscreen-video-container fullscreen-video-container--inactive">
        {poster ? (
          <img src={poster} alt="" className="fullscreen-video-poster" aria-hidden="true" />
        ) : (
          <span className="post-media-skeleton fullscreen-video-poster-skeleton" aria-hidden="true" />
        )}
      </div>
    );
  }

  if (!shouldMount) {
    return <div className="fullscreen-video-container" />;
  }

  return (
    <div className="fullscreen-video-container">
      <Suspense fallback={null}>
        <FullscreenVjsPlayer
          src={videoSrc}
          poster={poster}
          style={{
            transform:
              isClosing && isActiveSlideClosing && returnTransform
                ? returnTransform
                : `translate(${position.x}px, ${position.y}px)`
          }}
          ariaLabel={`Полноэкранное видео ${activeIndex + 1}`}
          videoRef={attachVideoRef}
          onClose={onClose}
        />
      </Suspense>
    </div>
  );
}

export default FullscreenSlideVideo;
