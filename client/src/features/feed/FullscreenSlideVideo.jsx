import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';
import { resolveVideoQualities } from '../../lib/videoQualities';

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
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));

  const activeQuality = useMemo(
    () => qualities.find((entry) => entry.id === qualityId) || qualities[qualities.length - 1] || null,
    [qualities, qualityId]
  );

  useEffect(() => {
    const fallback = qualities[qualities.length - 1]?.id || 'auto';
    setQualityId((current) => (qualities.some((entry) => entry.id === current) ? current : fallback));
  }, [qualities]);

  const attachVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (!isActiveSlide) return;
    mediaRef.current = el;
    onActiveVideoRef?.(el);
    if (el) {
      el.muted = false;
      void el.play().catch(() => {});
    }
  }, [isActiveSlide, mediaRef, onActiveVideoRef]);

  useEffect(() => {
    if (!isActiveSlide) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    void video.play().catch(() => {});
  }, [isActiveSlide, activeQuality?.src]);

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

  const showQualityMenu = isActiveSlide && qualities.length > 1;

  return (
    <div className="fullscreen-video-container">
      <video
        ref={isActiveSlide ? attachVideoRef : undefined}
        src={videoPreviewUrl(activeQuality?.src || item.url || '')}
        className="fullscreen-target-video"
        controls
        preload="metadata"
        playsInline
        aria-label={`Полноэкранное видео ${activeIndex + 1}`}
        width="1200"
        height="900"
        style={{
          transform: isClosing && isActiveSlideClosing && returnTransform
            ? returnTransform
            : isActiveSlide
              ? `translate(${position.x}px, ${position.y}px)`
              : undefined
        }}
      />
      {isActiveSlide && (
        <div
          className="fullscreen-video-tap-zone"
          style={{ bottom: controlsReservedPx }}
          onClick={onTapToggle}
          aria-hidden="true"
        />
      )}
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
