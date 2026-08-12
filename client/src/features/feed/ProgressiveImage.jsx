import React, { memo, useEffect, useState } from 'react';
import clsx from 'clsx';

/**
 * Placeholder → LQIP blur → полное фото.
 * Опционально выставляет aspect-ratio по naturalWidth/Height.
 *
 * @param {{
 *   src?: string | null,
 *   previewSrc?: string | null,
 *   alt?: string,
 *   className?: string,
 *   loading?: 'eager' | 'lazy',
 *   width?: number | string,
 *   height?: number | string,
 *   nativeAspect?: boolean,
 *   pending?: boolean
 * }} props
 */
function ProgressiveImage({
  src = null,
  previewSrc = null,
  alt = '',
  className,
  loading = 'lazy',
  width = 800,
  height = 600,
  nativeAspect = false,
  pending = false
}) {
  const hasSrc = Boolean(src);
  const hasDistinctPreview = Boolean(previewSrc && previewSrc !== src);
  const [aspect, setAspect] = useState(/** @type {number | null} */ (null));
  const [previewReady, setPreviewReady] = useState(false);
  const [fullReady, setFullReady] = useState(false);

  useEffect(() => {
    setAspect(null);
    setPreviewReady(false);
    setFullReady(false);
  }, [src, previewSrc, nativeAspect]);

  const captureAspect = (img) => {
    if (!nativeAspect || aspect != null) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w > 0 && h > 0) setAspect(w / h);
  };

  const handlePreviewLoad = (event) => {
    setPreviewReady(true);
    captureAspect(event.currentTarget);
  };

  const handleFullLoad = (event) => {
    setFullReady(true);
    captureAspect(event.currentTarget);
  };

  const bindIfComplete = (img, onReady) => {
    if (img?.complete && img.naturalWidth > 0) onReady({ currentTarget: img });
  };

  const wrapperStyle = nativeAspect
    ? { aspectRatio: String(aspect ?? 1.6) }
    : undefined;

  const showPlaceholder = pending || !fullReady;

  return (
    <span
      className={clsx(
        'progressive-image',
        className,
        nativeAspect && 'progressive-image--native-aspect',
        fullReady && 'progressive-image--ready',
        showPlaceholder && 'progressive-image--pending',
        !hasDistinctPreview && 'progressive-image--single'
      )}
      style={wrapperStyle}
    >
      <span className="progressive-image__placeholder" aria-hidden="true" />
      {hasDistinctPreview ? (
        <img
          ref={(el) => bindIfComplete(el, handlePreviewLoad)}
          src={previewSrc}
          alt=""
          aria-hidden="true"
          className={clsx(
            'progressive-image__layer',
            'progressive-image__preview',
            previewReady && 'is-visible'
          )}
          width={width}
          height={height}
          decoding="async"
          onLoad={handlePreviewLoad}
        />
      ) : null}
      {hasSrc ? (
        <img
          ref={(el) => bindIfComplete(el, handleFullLoad)}
          src={src}
          alt={alt}
          className={clsx(
            'progressive-image__layer',
            'progressive-image__full',
            fullReady && 'is-visible'
          )}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          onLoad={handleFullLoad}
        />
      ) : null}
    </span>
  );
}

export default memo(ProgressiveImage);
