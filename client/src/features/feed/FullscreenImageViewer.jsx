import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import IconButton from '../../components/ui/IconButton';
import FullscreenSlideVideo from './FullscreenSlideVideo';
import {
  getMemberLoadProgress,
  isYadiskOriginalPending,
  subscribeMemberLoadProgress
} from './yadiskMediaSessionCache';
import { useFetchedOriginal } from './useFetchedOriginal';

const SWIPE_NAV_THRESHOLD_PX = 36;
const NAV_CLICK_DRIFT_PX = 8;
const NAV_ZOOM_MAX_SCALE = 1.05;
const GESTURE_LOCK_PX = 10;
const SLIDE_ANIMATION_MS = 240;
const RIPPLE_ANIMATION_MS = 420;
/** Нижний отступ тап-зоны: нативная полоска controls (~56–72px, эмпирически под webview MAX). */
const VIDEO_CONTROLS_RESERVED_PX = 72;
const PROGRESS_RING_R = 15.5;
const PROGRESS_RING_C = 2 * Math.PI * PROGRESS_RING_R;

/**
 * @param {string | undefined} publicUrl
 * @param {string | null | undefined} path
 * @returns {number | null}
 */
function useYadiskLoadProgress(publicUrl, path) {
  const [progress, setProgress] = useState(() =>
    publicUrl ? getMemberLoadProgress(publicUrl, path) : null
  );

  useEffect(() => {
    if (!publicUrl) {
      setProgress(null);
      return undefined;
    }
    setProgress(getMemberLoadProgress(publicUrl, path));
    return subscribeMemberLoadProgress((url, memberPath, percent) => {
      if (url === publicUrl && (memberPath || '') === (path || '')) {
        setProgress(percent);
      }
    });
  }, [publicUrl, path]);

  return progress;
}

/**
 * @param {{ progress: number | null }} props
 */
function FullscreenLoadSpinner({ progress }) {
  const determinate = typeof progress === 'number' && progress > 0 && progress < 100;
  const pct = determinate ? progress : null;

  return (
    <span className="fullscreen-media-upgrade-spinner" aria-label="Загрузка оригинала">
      {pct != null ? (
        <span
          className="fullscreen-media-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle className="fullscreen-media-progress__track" cx="18" cy="18" r={PROGRESS_RING_R} />
            <circle
              className="fullscreen-media-progress__value"
              cx="18"
              cy="18"
              r={PROGRESS_RING_R}
              style={{
                strokeDasharray: `${PROGRESS_RING_C} ${PROGRESS_RING_C}`,
                strokeDashoffset: PROGRESS_RING_C * (1 - pct / 100)
              }}
            />
          </svg>
          <span className="fullscreen-media-progress__label">{pct}%</span>
        </span>
      ) : (
        <span className="fullscreen-media-pending__spinner" aria-hidden="true" />
      )}
    </span>
  );
}

function getWindowWidth() {
  return window.innerWidth || document.documentElement.clientWidth || 360;
}

function isTouchNavDevice() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
}

function getOriginRect(originKey) {
  if (!originKey) return null;
  const escapedKey = window.CSS?.escape ? window.CSS.escape(originKey) : originKey;
  const element = document.querySelector(`[data-media-origin-key="${escapedKey}"]`);
  return element?.getBoundingClientRect?.() || null;
}

function itemSlideId(item) {
  return item?.originKey || item?.filename || item?.url || item?.previewUrl || '';
}

function carouselSlideKey(item, index, trackItems) {
  const id = itemSlideId(item) || `slide-${index}`;
  const first = trackItems.findIndex((other) => itemSlideId(other) === id);
  return first === index ? id : `${id}__dup`;
}

function isImagePaintReady(src) {
  if (!src || typeof Image === 'undefined') return false;
  const probe = new Image();
  probe.src = src;
  return Boolean(probe.complete && probe.naturalWidth > 0);
}

function FullscreenSlideImage({
  item,
  isActiveSlide,
  mediaRef,
  alt,
  style
}) {
  const placeholder = item.thumbUrl || item.previewUrl || '';
  const fullSrc = item.url || placeholder;
  const distinctFull = Boolean(fullSrc && placeholder && fullSrc !== placeholder);
  const yadiskPhoto = Boolean(item.publicUrl) && !item.isVideo;
  const needsPbFetch =
    !yadiskPhoto &&
    !item.isVideo &&
    distinctFull &&
    /^https?:\/\//i.test(fullSrc);
  const pbOriginal = useFetchedOriginal(needsPbFetch ? fullSrc : '', needsPbFetch);
  const displayFullSrc = needsPbFetch
    ? pbOriginal.blobUrl || (pbOriginal.failed ? fullSrc : '')
    : fullSrc && (distinctFull || !placeholder)
      ? fullSrc
      : '';
  const srcEpoch = `${displayFullSrc}\0${placeholder}`;
  const [fullReady, setFullReady] = useState(() =>
    Boolean(displayFullSrc && (!distinctFull || isImagePaintReady(displayFullSrc)))
  );
  const [previewRetained, setPreviewRetained] = useState(Boolean(placeholder) && !fullReady);
  const [fadeFull, setFadeFull] = useState(false);
  const srcEpochRef = useRef(srcEpoch);

  useEffect(() => {
    if (srcEpochRef.current === srcEpoch) return;
    srcEpochRef.current = srcEpoch;
    const ready = Boolean(
      displayFullSrc && (!distinctFull || isImagePaintReady(displayFullSrc))
    );
    setFullReady(ready);
    setPreviewRetained(Boolean(placeholder) && !ready);
    setFadeFull(false);
  }, [displayFullSrc, distinctFull, placeholder, srcEpoch]);

  useEffect(() => {
    if (!fullReady || !distinctFull) return undefined;
    // Превью держим под оригиналом до конца fade-in — без «провала» в чёрный.
    const id = window.setTimeout(() => setPreviewRetained(false), 220);
    return () => window.clearTimeout(id);
  }, [distinctFull, fullReady]);

  const markFullReady = useCallback((img) => {
    if (!img || fullReady) return;
    const finish = () => {
      setFadeFull(true);
      setFullReady(true);
    };
    if (typeof img.decode === 'function') {
      img.decode().then(finish).catch(finish);
      return;
    }
    finish();
  }, [fullReady]);

  const yadiskProgress = useYadiskLoadProgress(item.publicUrl, item.path);
  const originalPending = isYadiskOriginalPending(item);
  const pending = Boolean(item.isLoading) && !placeholder && !fullSrc;
  const yadiskBytesInFlight =
    yadiskPhoto &&
    (originalPending || (typeof yadiskProgress === 'number' && yadiskProgress < 100));
  const pbBytesInFlight =
    needsPbFetch &&
    !pbOriginal.blobUrl &&
    !pbOriginal.failed &&
    (pbOriginal.progress == null || pbOriginal.progress < 100);
  const loadProgress = yadiskPhoto ? yadiskProgress : needsPbFetch ? pbOriginal.progress : null;
  const showSpinner =
    pending ||
    yadiskBytesInFlight ||
    pbBytesInFlight ||
    (!fullSrc && !placeholder) ||
    (pbOriginal.failed && distinctFull && !fullReady);
  const dimPreview = Boolean(
    placeholder && previewRetained && (yadiskPhoto || distinctFull)
  );

  if (pending && !placeholder) {
    return (
      <div className="fullscreen-media-pending" aria-label="Загрузка медиа">
        <span className="fullscreen-media-pending__spinner" aria-hidden="true" />
      </div>
    );
  }

  return (
    <span className="fullscreen-image-stack">
      {placeholder && previewRetained ? (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={clsx(
            'fullscreen-target-img',
            'fullscreen-target-img--preview',
            'is-visible',
            dimPreview && 'is-dimmed'
          )}
          width="1200"
          height="900"
          ref={(el) => {
            if (isActiveSlide && (!distinctFull || !fullReady)) mediaRef.current = el;
          }}
          style={style}
        />
      ) : null}
      {displayFullSrc ? (
        <img
          src={displayFullSrc}
          alt={alt}
          className={clsx(
            'fullscreen-target-img',
            'fullscreen-target-img--full',
            (!distinctFull || fullReady) && 'is-visible',
            fadeFull && 'is-fading'
          )}
          width="1200"
          height="900"
          onLoad={(event) => markFullReady(event.currentTarget)}
          ref={(el) => {
            if (isActiveSlide && (distinctFull || !placeholder)) mediaRef.current = el;
            if (el?.complete && el.naturalWidth > 0) markFullReady(el);
          }}
          style={style}
        />
      ) : null}
      {showSpinner ? <FullscreenLoadSpinner progress={loadProgress} /> : null}
    </span>
  );
}

/**
 * @param {{
 *   items: Array<{ filename: string, url: string, thumbUrl?: string, previewUrl?: string, isVideo: boolean, originKey?: string, postNumber?: number, isLoading?: boolean, isUpgrading?: boolean, publicUrl?: string, path?: string | null }>,
 *   initialIndex?: number,
 *   originRect?: DOMRect | null,
 *   originKey?: string | null,
 *   onCloseStart?: (originKey?: string | null) => void,
 *   onActiveIndexChange?: (index: number) => void,
 *   onActiveVideoRef?: (el: HTMLVideoElement | null) => void,
 *   onClose: () => void
 * }} props
 */
function FullscreenImageViewer({
  items,
  initialIndex = 0,
  originRect = null,
  originKey = null,
  onCloseStart,
  onActiveIndexChange,
  onActiveVideoRef,
  onClose
}) {
  useOverlayClose(true, onClose, 'fullscreen');
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [returnRect, setReturnRect] = useState(null);
  const [ripple, setRipple] = useState(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pointerDownRef = useRef({ x: 0, y: 0 });
  const gestureModeRef = useRef('idle');
  const wheelTargetRef = useRef(null);
  const mediaRef = useRef(/** @type {HTMLImageElement | HTMLVideoElement | null} */ (null));
  const panMetricsRef = useRef({
    mediaWidth: 0,
    mediaHeight: 0,
    viewportWidth: 0,
    viewportHeight: 0
  });
  const slideTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const rippleTimerRef = useRef(null);
  const hasItems = items.length > 0;
  const galleryKey = useMemo(
    () => items.map((item) => item.originKey || item.filename).join('\0'),
    [items]
  );
  const activeItem = items[activeIndex] || null;
  const hasMultiple = items.length > 1;
  const isTouchNav = isTouchNavDevice();
  const hideActiveOrigin = useCallback(() => {
    onCloseStart?.(activeItem?.originKey || originKey || null);
  }, [activeItem?.originKey, onCloseStart, originKey]);
  const showActiveOrigin = useCallback(() => {
    onCloseStart?.(null);
  }, [onCloseStart]);
  const completeClose = useCallback(() => {
    onActiveVideoRef?.(null);
    onClose();
  }, [onActiveVideoRef, onClose]);
  const requestClose = useCallback(() => {
    if (isClosing) return;
    const closingOriginKey = activeItem?.originKey || originKey;
    const nextReturnRect = getOriginRect(closingOriginKey) || originRect;

    if (!nextReturnRect) {
      completeClose();
      return;
    }
    hideActiveOrigin();
    setReturnRect(nextReturnRect);
    setIsClosing(true);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(completeClose, SLIDE_ANIMATION_MS);
  }, [activeItem?.originKey, completeClose, hideActiveOrigin, isClosing, originKey, originRect]);
  const updatePanMetrics = useCallback(() => {
    const viewport = wheelTargetRef.current;
    const media = mediaRef.current;
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      panMetricsRef.current.viewportWidth = rect.width;
      panMetricsRef.current.viewportHeight = rect.height;
    }
    if (media) {
      panMetricsRef.current.mediaWidth = media.offsetWidth;
      panMetricsRef.current.mediaHeight = media.offsetHeight;
    }
  }, []);

  const getPanMetrics = useCallback(() => ({ ...panMetricsRef.current }), []);

  const {
    scale,
    position,
    bgOpacity,
    reset,
    handleWheel,
    handlePointerDown: handleZoomPointerDown,
    handlePointerMove: handleZoomPointerMove,
    handlePointerUp: handleZoomPointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = usePinchZoom({
    onClose: requestClose,
    onSwipeCloseStart: hideActiveOrigin,
    onSwipeCloseCancel: showActiveOrigin,
    getPanMetrics
  });

  const isImage = activeItem && !activeItem.isVideo;
  const showNavControls =
    hasMultiple && !isTouchNav && scale <= NAV_ZOOM_MAX_SCALE && !isClosing;

  const goTo = useCallback((nextIndex, { animated = false } = {}) => {
    if (items.length === 0) return;
    const normalizedIndex = (nextIndex + items.length) % items.length;
    if (animated && normalizedIndex !== activeIndex) {
      window.clearTimeout(slideTimerRef.current);
      const direction = normalizedIndex > activeIndex || (activeIndex === items.length - 1 && normalizedIndex === 0)
        ? -1
        : 1;
      setIsSliding(true);
      setSwipeOffset(direction * getWindowWidth());
      slideTimerRef.current = window.setTimeout(() => {
        setActiveIndex(normalizedIndex);
        setIsSliding(false);
        setSwipeOffset(0);
        onActiveIndexChange?.(normalizedIndex);
        reset();
      }, SLIDE_ANIMATION_MS);
      return;
    }
    setActiveIndex(normalizedIndex);
    onActiveIndexChange?.(normalizedIndex);
    setSwipeOffset(0);
    setIsSliding(false);
    reset();
  }, [activeIndex, items.length, onActiveIndexChange, reset]);

  const goNext = useCallback((options) => goTo(activeIndex + 1, options), [activeIndex, goTo]);
  const goPrev = useCallback((options) => goTo(activeIndex - 1, options), [activeIndex, goTo]);

  useEffect(() => {
    setIsClosing(false);
    window.clearTimeout(closeTimerRef.current);
    setActiveIndex(Math.min(initialIndex, Math.max(items.length - 1, 0)));
    setSwipeOffset(0);
    setIsSliding(false);
    setReturnRect(null);
    setRipple(null);
    gestureModeRef.current = 'idle';
    reset();
  }, [initialIndex, galleryKey, items.length, reset]);

  useEffect(() => {
    if (!hasItems) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') requestClose();
      if (hasMultiple && e.key === 'ArrowLeft') goPrev();
      if (hasMultiple && e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [goNext, goPrev, hasItems, hasMultiple, requestClose]);

  useEffect(() => {
    if (!hasItems) reset();
  }, [hasItems, reset]);

  useLayoutEffect(() => {
    updatePanMetrics();
    const viewport = wheelTargetRef.current;
    const media = mediaRef.current;
    if (!viewport) return undefined;

    const observer = new ResizeObserver(() => updatePanMetrics());
    observer.observe(viewport);
    if (media) observer.observe(media);

    const handleMediaReady = () => updatePanMetrics();
    if (media instanceof HTMLImageElement) {
      if (media.complete) handleMediaReady();
      else media.addEventListener('load', handleMediaReady);
    } else if (media instanceof HTMLVideoElement) {
      if (media.readyState >= 1) handleMediaReady();
      else media.addEventListener('loadedmetadata', handleMediaReady);
    }

    return () => {
      observer.disconnect();
      if (media instanceof HTMLImageElement) {
        media.removeEventListener('load', handleMediaReady);
      } else if (media instanceof HTMLVideoElement) {
        media.removeEventListener('loadedmetadata', handleMediaReady);
      }
    };
  }, [activeIndex, activeItem?.url, activeItem?.isVideo, updatePanMetrics]);

  useEffect(() => {
    if (!activeItem?.isVideo) onActiveVideoRef?.(null);
  }, [activeItem?.isVideo, onActiveVideoRef]);

  useEffect(() => {
    return () => {
      window.clearTimeout(slideTimerRef.current);
      window.clearTimeout(closeTimerRef.current);
      window.clearTimeout(rippleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const node = wheelTargetRef.current;
    if (!node || !isImage) return undefined;
    const handleNativeWheel = (event) => {
      event.preventDefault();
      handleWheel(event);
    };
    node.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleNativeWheel);
  }, [handleWheel, isImage, activeIndex]);

  const counterText = useMemo(() => {
    const postNum = activeItem?.postNumber;
    if (postNum) {
      return hasMultiple ? `#${postNum} (${activeIndex + 1} / ${items.length})` : `#${postNum}`;
    }
    return hasMultiple ? `${activeIndex + 1} / ${items.length}` : '';
  }, [activeIndex, activeItem?.postNumber, hasMultiple, items.length]);

  const handleViewerTouchStart = (event) => {
    gestureModeRef.current = 'pending';
    if (event.touches.length === 1) {
      touchStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
    if (isImage || activeItem?.isVideo) handleTouchStart(event);
  };

  const handleViewerTouchMove = (event) => {
    if (event.touches.length !== 1) {
      if (isImage) handleTouchMove(event);
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (isImage && scale > NAV_ZOOM_MAX_SCALE) {
      gestureModeRef.current = 'pan';
      handleTouchMove(event);
      return;
    }

    if (gestureModeRef.current === 'pending') {
      if (
        hasMultiple &&
        scale <= NAV_ZOOM_MAX_SCALE &&
        Math.abs(dx) > GESTURE_LOCK_PX &&
        Math.abs(dx) > Math.abs(dy) * 1.35
      ) {
        gestureModeRef.current = 'horizontal';
      } else if (
        Math.abs(dy) > GESTURE_LOCK_PX &&
        Math.abs(dy) > Math.abs(dx) * 1.25
      ) {
        gestureModeRef.current = 'vertical';
      } else {
        return;
      }
    }

    if (gestureModeRef.current === 'horizontal') {
      setSwipeOffset(dx);
      return;
    }

    if (gestureModeRef.current === 'vertical' && (isImage || activeItem?.isVideo)) {
      handleTouchMove(event);
    }
  };

  const handleViewerTouchEnd = (event) => {
    const changedTouch = event.changedTouches[0];
    const dx = changedTouch.clientX - touchStartRef.current.x;
    const dy = changedTouch.clientY - touchStartRef.current.y;

    if (gestureModeRef.current === 'horizontal') {
      if (Math.abs(dx) > SWIPE_NAV_THRESHOLD_PX) {
        if (dx < 0) goNext({ animated: true });
        else goPrev({ animated: true });
      } else {
        setIsSliding(true);
        setSwipeOffset(0);
        window.setTimeout(() => setIsSliding(false), SLIDE_ANIMATION_MS);
      }
      gestureModeRef.current = 'idle';
      return;
    }

    if ((isImage || activeItem?.isVideo) && (gestureModeRef.current === 'vertical' || gestureModeRef.current === 'pan')) {
      handleTouchEnd();
    }
    gestureModeRef.current = 'idle';
  };

  const handleWrapperPointerDown = (event) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
    if (event.target instanceof Element && event.target.closest('button')) return;
    if (isImage) handleZoomPointerDown(event);
  };

  const handleContentClick = (event) => {
    event.stopPropagation();
    if (!hasMultiple) return;
    if (event.target instanceof Element && event.target.closest('button')) return;

    const dx = Math.abs(event.clientX - pointerDownRef.current.x);
    const dy = Math.abs(event.clientY - pointerDownRef.current.y);
    if (dx > NAV_CLICK_DRIFT_PX || dy > NAV_CLICK_DRIFT_PX) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (scale > NAV_ZOOM_MAX_SCALE) return;
    if (x < rect.width * 0.38) goPrev({ animated: true });
    if (x > rect.width * 0.62) goNext({ animated: true });
  };

  const handleVideoTapToggle = useCallback((event) => {
    event.stopPropagation();
    const video = mediaRef.current;
    if (!(video instanceof HTMLVideoElement)) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  const handleNavClick = (event, direction) => {
    const rect = event.currentTarget.getBoundingClientRect();
    window.clearTimeout(rippleTimerRef.current);
    setRipple({
      id: `${direction}-${performance.now()}`,
      direction,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
    rippleTimerRef.current = window.setTimeout(() => setRipple(null), RIPPLE_ANIMATION_MS);
    if (direction === 'prev') goPrev({ animated: true });
    else goNext({ animated: true });
  };

  const setActiveVideoRef = useCallback((el) => {
    if (el) {
      el.muted = false;
      void el.play().catch(() => {});
    }
    onActiveVideoRef?.(el);
  }, [onActiveVideoRef]);

  const prevItem = items[(activeIndex - 1 + items.length) % items.length];
  const nextItem = items[(activeIndex + 1) % items.length];
  const trackItems = hasMultiple ? [prevItem, activeItem, nextItem] : [activeItem];
  const trackTranslate = hasMultiple ? `calc(-100% + ${swipeOffset}px)` : `${swipeOffset}px`;

  const returnTransform = useMemo(() => {
    const rect = returnRect || originRect;
    if (!rect) return null;
    const viewportWidth = getWindowWidth();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;
    const dx = rect.left + rect.width / 2 - viewportWidth / 2;
    const dy = rect.top + rect.height / 2 - viewportHeight / 2;
    const targetScale = Math.max(
      0.12,
      Math.min(rect.width / viewportWidth, rect.height / viewportHeight)
    );
    return `translate(${dx}px, ${dy}px) scale(${targetScale})`;
  }, [originRect, returnRect]);

  const renderSlideContent = (item, isActiveSlide) => {
    const pendingVideo = item.isVideo && (Boolean(item.isLoading) || !item.url);
    const imageStyle = {
      transform: isClosing && isActiveSlide && returnTransform
        ? returnTransform
        : `translate(${isActiveSlide ? position.x : 0}px, ${isActiveSlide ? position.y : 0}px) scale(${isActiveSlide ? scale : 1})`
    };

    if (item.isVideo) {
      if (pendingVideo) {
        return (
          <div className="fullscreen-media-pending" aria-label="Загрузка медиа">
            <span className="fullscreen-media-pending__spinner" aria-hidden="true" />
          </div>
        );
      }
      return (
        <FullscreenSlideVideo
          item={item}
          isActiveSlide={isActiveSlide}
          mediaRef={mediaRef}
          onActiveVideoRef={setActiveVideoRef}
          controlsReservedPx={VIDEO_CONTROLS_RESERVED_PX}
          isClosing={isClosing}
          isActiveSlideClosing={isActiveSlide}
          returnTransform={returnTransform}
          position={position}
          onTapToggle={handleVideoTapToggle}
          activeIndex={activeIndex}
        />
      );
    }

    return (
      <FullscreenSlideImage
        item={item}
        isActiveSlide={isActiveSlide}
        mediaRef={mediaRef}
        alt={`Полноразмерное изображение ${activeIndex + 1}`}
        style={imageStyle}
      />
    );
  };

  if (!activeItem) return null;

  return createPortal(
    <div
      className="fullscreen-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр медиа"
      onClick={requestClose}
      style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})` }}
      data-closing={isClosing ? 'true' : undefined}
    >
      {counterText && <div className="fullscreen-counter">{counterText}</div>}
      <IconButton
        ariaLabel="Закрыть просмотр"
        size="md"
        variant="ghost"
        className="fullscreen-close-btn"
        onClick={(event) => {
          event.stopPropagation();
          requestClose();
        }}
      >
        <span aria-hidden="true">✕</span>
      </IconButton>
      <div
        ref={wheelTargetRef}
        className="fullscreen-image-wrapper"
        onClick={handleContentClick}
        onPointerDown={handleWrapperPointerDown}
        onPointerMove={isImage ? handleZoomPointerMove : undefined}
        onPointerUp={isImage ? handleZoomPointerUp : undefined}
        onPointerCancel={isImage ? handleZoomPointerUp : undefined}
        onTouchStart={handleViewerTouchStart}
        onTouchMove={handleViewerTouchMove}
        onTouchEnd={handleViewerTouchEnd}
      >
        {showNavControls && (
          <>
            <button
              type="button"
              className="fullscreen-nav-zone fullscreen-nav-zone--left"
              onClick={(event) => handleNavClick(event, 'prev')}
              aria-label="Предыдущее медиа"
            >
              {ripple?.direction === 'prev' && (
                <span
                  key={ripple.id}
                  className="fullscreen-nav-ripple"
                  style={{ left: ripple.x, top: ripple.y }}
                />
              )}
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="fullscreen-nav-zone fullscreen-nav-zone--right"
              onClick={(event) => handleNavClick(event, 'next')}
              aria-label="Следующее медиа"
            >
              {ripple?.direction === 'next' && (
                <span
                  key={ripple.id}
                  className="fullscreen-nav-ripple"
                  style={{ left: ripple.x, top: ripple.y }}
                />
              )}
              <span aria-hidden="true">›</span>
            </button>
          </>
        )}

        <div
          className={`fullscreen-carousel-track ${isSliding ? 'is-sliding' : ''}`}
          style={{ transform: `translate3d(${trackTranslate}, 0, 0)` }}
        >
          {trackItems.map((item, index) => {
            const isActiveSlide = !hasMultiple || index === 1;
            return (
              <div
                className="fullscreen-carousel-slide"
                data-active={isActiveSlide ? 'true' : undefined}
                key={carouselSlideKey(item, index, trackItems)}
              >
                {renderSlideContent(item, isActiveSlide)}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default FullscreenImageViewer;
