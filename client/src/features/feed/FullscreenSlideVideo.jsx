import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { resolveVideoQualities } from '../../lib/videoQualities';
import { useFetchedOriginal } from './useFetchedOriginal';

/**
 * @param {HTMLVideoElement | null} video
 */
function stopVideoLoad(video) {
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.load();
}

/**
 * @param {{
 *   item: { url?: string, previewUrl?: string, thumbUrl?: string },
 *   isActiveSlide: boolean,
 *   mediaRef: React.MutableRefObject<HTMLImageElement | HTMLVideoElement | null>,
 *   onActiveVideoRef?: (el: HTMLVideoElement | null) => void,
 *   controlsReservedPx: number,
 *   isClosing: boolean,
 *   isActiveSlideClosing: boolean,
 *   returnTransform: string | null,
 *   position: { x: number, y: number },
 *   onTapToggle: (event: React.MouseEvent) => void,
 *   activeIndex: number
 * }} props
 */
function FullscreenSlideVideo({
  item,
  isActiveSlide,
  mediaRef,
  onActiveVideoRef,
  controlsReservedPx,
  isClosing,
  isActiveSlideClosing,
  returnTransform,
  position,
  onTapToggle,
  activeIndex
}) {
  const qualities = useMemo(() => resolveVideoQualities(item), [item]);
  const [qualityId, setQualityId] = useState(() => qualities[qualities.length - 1]?.id || 'auto');
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));

  const activeQuality = useMemo(
    () => qualities.find((entry) => entry.id === qualityId) || qualities[qualities.length - 1] || null,
    [qualities, qualityId]
  );

  const videoSrc = activeQuality?.src || item.url || '';
  const poster = item.thumbUrl || item.previewUrl || '';
  const shouldLoadVideo = isActiveSlide && !isClosing && Boolean(videoSrc);
  const httpVideo = Boolean(shouldLoadVideo && /^https?:\/\//i.test(videoSrc));
  const fetched = useFetchedOriginal(httpVideo ? videoSrc : '', httpVideo);
  const playSrc = httpVideo ? fetched.blobUrl || '' : shouldLoadVideo ? videoSrc : '';
  const shouldMountVideo = Boolean(playSrc);

  useEffect(() => {
    const fallback = qualities[qualities.length - 1]?.id || 'auto';
    setQualityId((current) => (qualities.some((entry) => entry.id === current) ? current : fallback));
  }, [qualities]);

  useEffect(() => {
    if (shouldMountVideo) return undefined;
    setVideoReady(false);
    stopVideoLoad(videoRef.current);
    if (isActiveSlide) {
      mediaRef.current = null;
      onActiveVideoRef?.(null);
    }
    return undefined;
  }, [shouldMountVideo, isActiveSlide, mediaRef, onActiveVideoRef]);

  useEffect(() => {
    setVideoReady(false);
  }, [playSrc, shouldMountVideo]);

  const attachVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (!shouldMountVideo || !el) return;
    mediaRef.current = el;
    onActiveVideoRef?.(el);
    el.muted = false;
    void el.play().catch(() => {});
  }, [shouldMountVideo, mediaRef, onActiveVideoRef]);

  useEffect(() => {
    if (!shouldMountVideo) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    void video.play().catch(() => {});
  }, [shouldMountVideo, playSrc]);

  const handleQualitySelect = useCallback((nextId) => {
    setQualityId(nextId);
    setMenuOpen(false);
    const video = videoRef.current;
    if (!video) return;
    const wasPlaying = !video.paused;
    const time = video.currentTime;
    const onLoaded = () => {
      try {
        video.currentTime = time;
      } catch {
        // ignore
      }
      if (wasPlaying) void video.play().catch(() => {});
      video.removeEventListener('loadedmetadata', onLoaded);
    };
    video.addEventListener('loadedmetadata', onLoaded);
  }, []);

  const showQualityMenu = shouldLoadVideo && qualities.length > 1;

  if (!isActiveSlide) {
    return (
      <div className="fullscreen-video-container fullscreen-video-container--inactive">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="fullscreen-video-poster"
            aria-hidden="true"
          />
        ) : (
          <span className="post-media-skeleton fullscreen-video-poster-skeleton" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <div className="fullscreen-video-container">
      {poster && !videoReady ? (
        <img
          src={poster}
          alt=""
          className="fullscreen-video-poster fullscreen-video-poster--loading"
          aria-hidden="true"
        />
      ) : null}
      {httpVideo && !playSrc && !fetched.failed && typeof fetched.progress === 'number' ? (
        <span className="fullscreen-video-fetch-progress" aria-live="polite">
          {fetched.progress}%
        </span>
      ) : null}
      {shouldMountVideo ? (
        <video
          ref={attachVideoRef}
          src={playSrc}
          className={clsx('fullscreen-target-video', videoReady && 'is-ready')}
          controls
          preload="auto"
          playsInline
          aria-label={`Полноэкранное видео ${activeIndex + 1}`}
          width="1200"
          height="900"
          style={{
            transform: isClosing && isActiveSlideClosing && returnTransform
              ? returnTransform
              : `translate(${position.x}px, ${position.y}px)`
          }}
          onCanPlay={() => setVideoReady(true)}
          onLoadedData={() => setVideoReady(true)}
        />
      ) : null}
      <div
        className="fullscreen-video-tap-zone"
        style={{ bottom: controlsReservedPx }}
        onClick={onTapToggle}
        aria-hidden="true"
      />
      {showQualityMenu && (
        <div className={clsx('fullscreen-video-quality', menuOpen && 'is-open')}>
          <button
            type="button"
            className="fullscreen-video-quality__toggle"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-label="Качество видео"
          >
            {activeQuality?.label || 'Авто'}
          </button>
          {menuOpen && (
            <ul className="fullscreen-video-quality__menu" role="listbox" aria-label="Качество видео">
              {qualities.map((entry) => (
                <li key={entry.id} role="option" aria-selected={entry.id === qualityId}>
                  <button
                    type="button"
                    className={clsx(entry.id === qualityId && 'is-active')}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleQualitySelect(entry.id);
                    }}
                  >
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default FullscreenSlideVideo;
