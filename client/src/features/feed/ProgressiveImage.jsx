import React, { memo, useEffect, useState } from 'react';
import clsx from 'clsx';

/**
 * LQIP → полное фото. Опционально выставляет aspect-ratio по naturalWidth/Height.
 *
 * @param {{
 *   src: string,
 *   previewSrc?: string | null,
 *   alt?: string,
 *   className?: string,
 *   loading?: 'eager' | 'lazy',
 *   width?: number | string,
 *   height?: number | string,
 *   nativeAspect?: boolean
 * }} props
 */
function ProgressiveImage({
  src,
  previewSrc = null,
  alt = '',
  className,
  loading = 'lazy',
  width = 800,
  height = 600,
  nativeAspect = false
}) {
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

  const wrapperStyle = nativeAspect
    ? { aspectRatio: String(aspect ?? 1.6) }
    : undefined;

  return (
    <span
      className={clsx(
        'progressive-image',
        className,
        nativeAspect && 'progressive-image--native-aspect',
        fullReady && 'progressive-image--ready',
        !hasDistinctPreview && 'progressive-image--single'
      )}
      style={wrapperStyle}
    >
      {hasDistinctPreview ? (
        <img
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
          onLoad={(event) => {
            setPreviewReady(true);
            captureAspect(event.currentTarget);
          }}
        />
      ) : null}
      <img
        src={src}
        alt={alt}
        className={clsx(
          'progressive-image__layer',
          'progressive-image__full',
          (!hasDistinctPreview || fullReady) && 'is-visible'
        )}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        onLoad={(event) => {
          setFullReady(true);
          captureAspect(event.currentTarget);
        }}
      />
    </span>
  );
}

export default memo(ProgressiveImage);
