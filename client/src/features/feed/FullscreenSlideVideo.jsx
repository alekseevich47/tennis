import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { resolveVideoQualities } from '../../lib/videoQualities';
import { useFetchedOriginal } from './useFetchedOriginal';

const FullscreenVjsPlayer = lazy(() => import('./FullscreenVjsPlayer'));

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
 *   isClosing: boolean,
 *   isActiveSlideClosing: boolean,
 *   returnTransform: string | null,
 *   position: { x: number, y: number },
 *   activeIndex: number
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
  activeIndex
}) {
  const qualities = useMemo(() => resolveVideoQualities(item), [item]);
  const [qualityId, setQualityId] = useState(() => qualities[qualities.length - 1]?.id || 'auto');
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const playSrcRef = useRef('');
  const resumeAfterSrcRef = useRef(/** @type {{ time: number, play: boolean } | null} */ (null));
  const lastPlaybackRef = useRef({ time: 0, play: true });

  const activeQuality = useMemo(
    () => qualities.find((entry) => entry.id === qualityId) || qualities[qualities.length - 1] || null,
    [qualities, qualityId]
  );

  const videoSrc = activeQuality?.src || item.url || '';
  const poster = item.thumbUrl || item.previewUrl || '';
  const shouldLoadVideo = isActiveSlide && !isClosing && Boolean(videoSrc);
  const httpVideo = Boolean(shouldLoadVideo && /^https?:\/\//i.test(videoSrc));
  const fetched = useFetchedOriginal(httpVideo ? videoSrc : '', httpVideo, { progressive: true });
  const playSrc = httpVideo ? fetched.blobUrl || '' : shouldLoadVideo ? videoSrc : '';
  const shouldMountVideo = Boolean(playSrc);

  useEffect(() => {
    const fallback = qualities[qualities.length - 1]?.id || 'auto';
    setQualityId((current) => (qualities.some((entry) => entry.id === current) ? current : fallback));
  }, [qualities]);

  useEffect(() => {
    if (shouldMountVideo) return undefined;
    setVideoReady(false);
    setBuffering(false);
    stopVideoLoad(videoRef.current);
    playSrcRef.current = '';
    resumeAfterSrcRef.current = null;
    lastPlaybackRef.current = { time: 0, play: true };
    if (isActiveSlide) {
      mediaRef.current = null;
      onActiveVideoRef?.(null);
    }
    return undefined;
  }, [shouldMountVideo, isActiveSlide, mediaRef, onActiveVideoRef]);

  useEffect(() => {
    if (!shouldMountVideo || !playSrc) return undefined;

    const video = videoRef.current;
    const prev = playSrcRef.current;
    /** @type {{ time: number, play: boolean }} */
    let resume = { time: 0, play: true };

    if (!prev) {
      playSrcRef.current = playSrc;
      lastPlaybackRef.current = { time: 0, play: true };
      setVideoReady(false);
      setBuffering(true);
    } else if (prev !== playSrc) {
      resume = { ...lastPlaybackRef.current };
      playSrcRef.current = playSrc;
      setBuffering(true);
    } else {
      return undefined;
    }

    if (!video) {
      resumeAfterSrcRef.current = resume;
      return undefined;
    }

    video.muted = false;
    if (resume.time > 0.05) {
      const onLoaded = () => {
        try {
          video.currentTime = resume.time;
        } catch {
          // ignore
        }
        if (resume.play) void video.play().catch(() => {});
        video.removeEventListener('loadedmetadata', onLoaded);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      void video.play().catch(() => {});
      return () => video.removeEventListener('loadedmetadata', onLoaded);
    }

    void video.play().catch(() => {});
    return undefined;
  }, [playSrc, shouldMountVideo]);

  const attachVideoRef = useCallback(
    (el) => {
      videoRef.current = el;
      if (!shouldMountVideo || !el) return;
      mediaRef.current = el;
      onActiveVideoRef?.(el);
      el.muted = false;
      const resume = resumeAfterSrcRef.current;
      resumeAfterSrcRef.current = null;
      if (resume && resume.time > 0.05) {
        const onLoaded = () => {
          try {
            el.currentTime = resume.time;
          } catch {
            // ignore
          }
          if (resume.play) void el.play().catch(() => {});
          el.removeEventListener('loadedmetadata', onLoaded);
        };
        el.addEventListener('loadedmetadata', onLoaded);
      }
      void el.play().catch(() => {});
    },
    [shouldMountVideo, mediaRef, onActiveVideoRef]
  );

  const markPlayable = useCallback(() => {
    setVideoReady(true);
    setBuffering(false);
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    void video.play().catch(() => {});
  }, []);

  const handleWaiting = useCallback(() => {
    setBuffering(true);
    const video = videoRef.current;
    if (video) {
      lastPlaybackRef.current = { time: video.currentTime, play: !video.paused };
    }
    if (fetched.isPartial) fetched.extendPartial();
  }, [fetched.isPartial, fetched.extendPartial]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    lastPlaybackRef.current = { time: video.currentTime, play: !video.paused };
  }, []);

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
  const showSpinner =
    shouldLoadVideo &&
    !fetched.failed &&
    (!shouldMountVideo || buffering || !videoReady);

  const playerStyle = {
    transform:
      isClosing && isActiveSlideClosing && returnTransform
        ? returnTransform
        : `translate(${position.x}px, ${position.y}px)`
  };

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
      {showSpinner ? (
        <span className="fullscreen-media-upgrade-spinner" aria-label="Загрузка видео">
          <span className="fullscreen-media-pending__spinner" aria-hidden="true" />
        </span>
      ) : null}
      {shouldMountVideo ? (
        <Suspense fallback={null}>
          <FullscreenVjsPlayer
            src={playSrc}
            poster={poster}
            className={clsx(videoReady && 'is-ready')}
            style={playerStyle}
            ariaLabel={`Полноэкранное видео ${activeIndex + 1}`}
            videoRef={attachVideoRef}
            onCanPlay={markPlayable}
            onPlaying={() => setBuffering(false)}
            onWaiting={handleWaiting}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handleTimeUpdate}
            onPause={handleTimeUpdate}
          />
        </Suspense>
      ) : null}
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
