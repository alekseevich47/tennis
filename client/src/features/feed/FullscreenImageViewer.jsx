import React, { useEffect } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import IconButton from '../../components/ui/IconButton';

/**
 * @param {{ imageUrl: string | null, onClose: () => void }} props
 */
function FullscreenImageViewer({ imageUrl, onClose }) {
  const { scale, position, bgOpacity, reset, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePinchZoom({ onClose });

  useEffect(() => {
    if (!imageUrl) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [imageUrl, onClose]);

  useEffect(() => {
    if (!imageUrl) reset();
  }, [imageUrl, reset]);

  if (!imageUrl) return null;

  return (
    <div
      className="fullscreen-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фотографии"
      onClick={onClose}
      style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})` }}
    >
      <IconButton
        ariaLabel="Закрыть просмотр"
        size="md"
        variant="ghost"
        className="fullscreen-close-btn"
        onClick={onClose}
      >
        <span aria-hidden="true">✕</span>
      </IconButton>
      <div
        className="fullscreen-image-wrapper"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imageUrl}
          alt="Полноразмерное изображение"
          className="fullscreen-target-img"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
          }}
        />
      </div>
    </div>
  );
}

export default FullscreenImageViewer;
