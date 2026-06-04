import React, { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './ui/Modal';
import {
  MAX_SCALE,
  MIN_SCALE,
  clamp,
  getTouchDistance
} from '../lib/gestures';
import './AvatarCropModal.css';

const OUTPUT_SIZE = 400;
const WHEEL_ZOOM_STEP = 0.0015;

function getCropCircle(viewport) {
  const radius = Math.max(0, Math.min(viewport.width, viewport.height) * 0.4);
  return {
    radius,
    diameter: radius * 2,
    centerX: viewport.width / 2,
    centerY: viewport.height / 2
  };
}

function getImagePlacement(image, viewport, scale, offset) {
  const circle = getCropCircle(viewport);
  if (!image || !circle.radius) return null;

  const baseScale = Math.max(
    circle.diameter / image.naturalWidth,
    circle.diameter / image.naturalHeight
  );
  const displayScale = baseScale * scale;
  const width = image.naturalWidth * displayScale;
  const height = image.naturalHeight * displayScale;

  return {
    ...circle,
    displayScale,
    width,
    height,
    x: circle.centerX + offset.x - width / 2,
    y: circle.centerY + offset.y - height / 2
  };
}

function AvatarCropModal({ isOpen, file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const stageRef = useRef(null);
  const imageRef = useRef(null);
  const viewportRef = useRef({ width: 0, height: 0 });
  const scaleRef = useRef(MIN_SCALE);
  const offsetRef = useRef({ x: 0, y: 0 });
  const touchRef = useRef({
    mode: 'idle',
    lastX: 0,
    lastY: 0,
    distance: 0
  });
  const pointerRef = useRef({
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0
  });

  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    imageRef.current = image;
  }, [image]);

  const clampOffset = useCallback((nextOffset, nextScale = scaleRef.current) => {
    const currentImage = imageRef.current;
    const currentViewport = viewportRef.current;
    if (!currentImage) return { x: 0, y: 0 };

    const placement = getImagePlacement(currentImage, currentViewport, nextScale, { x: 0, y: 0 });
    if (!placement) return { x: 0, y: 0 };

    const limitX = Math.max(0, (placement.width - placement.diameter) / 2);
    const limitY = Math.max(0, (placement.height - placement.diameter) / 2);

    return {
      x: clamp(nextOffset.x, -limitX, limitX),
      y: clamp(nextOffset.y, -limitY, limitY)
    };
  }, []);

  const setTransform = useCallback((nextScale, nextOffset) => {
    scaleRef.current = nextScale;
    offsetRef.current = nextOffset;
    setScale(nextScale);
    setOffset(nextOffset);
  }, []);

  const zoomAtPoint = useCallback((targetScale, point) => {
    const currentViewport = viewportRef.current;
    const circle = getCropCircle(currentViewport);
    if (!circle.radius) return;

    const previousScale = scaleRef.current;
    const nextScale = clamp(targetScale, MIN_SCALE, MAX_SCALE);

    const ratio = nextScale / previousScale;
    const anchorX = point.x - circle.centerX;
    const anchorY = point.y - circle.centerY;
    const previousOffset = offsetRef.current;
    const nextOffset = clampOffset(
      {
        x: anchorX - (anchorX - previousOffset.x) * ratio,
        y: anchorY - (anchorY - previousOffset.y) * ratio
      },
      nextScale
    );

    setTransform(nextScale, nextOffset);
  }, [clampOffset, setTransform]);

  const panBy = useCallback((deltaX, deltaY) => {
    const currentScale = scaleRef.current;

    const nextOffset = clampOffset(
      {
        x: offsetRef.current.x + deltaX,
        y: offsetRef.current.y + deltaY
      },
      currentScale
    );
    setTransform(currentScale, nextOffset);
  }, [clampOffset, setTransform]);

  const pointFromClient = useCallback((clientX, clientY) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !file) {
      setImage(null);
      setImageError(false);
      return undefined;
    }

    setImage(null);
    setImageError(false);
    setIsExporting(false);
    setTransform(MIN_SCALE, { x: 0, y: 0 });

    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      imageRef.current = nextImage;
      setImage(nextImage);
    };
    nextImage.onerror = () => {
      setImageError(true);
      setImage(null);
    };
    nextImage.src = url;

    return () => {
      nextImage.onload = null;
      nextImage.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file, isOpen, setTransform]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateViewport = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      setViewport({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height)
      });
    };

    updateViewport();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewport);
      return () => window.removeEventListener('resize', updateViewport);
    }

    const observer = new ResizeObserver(updateViewport);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewport.width || !viewport.height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(viewport.width * dpr);
    canvas.height = Math.round(viewport.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    const placement = getImagePlacement(image, viewport, scale, offset);
    if (placement) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, placement.x, placement.y, placement.width, placement.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
      ctx.beginPath();
      ctx.rect(0, 0, viewport.width, viewport.height);
      ctx.arc(placement.centerX, placement.centerY, placement.radius, 0, Math.PI * 2);
      ctx.fill('evenodd');

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(placement.centerX, placement.centerY, placement.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [image, offset, scale, viewport]);

  const handleTouchStart = useCallback((event) => {
    if (!imageRef.current) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchRef.current = {
        mode: 'pan',
        lastX: touch.clientX,
        lastY: touch.clientY,
        distance: 0
      };
    } else if (event.touches.length === 2) {
      touchRef.current = {
        mode: 'pinch',
        lastX: 0,
        lastY: 0,
        distance: getTouchDistance(event.touches[0], event.touches[1])
      };
    }
  }, []);

  const handleTouchMove = useCallback((event) => {
    if (!imageRef.current) return;

    if (event.touches.length === 1 && touchRef.current.mode === 'pan') {
      event.preventDefault();
      const touch = event.touches[0];
      panBy(touch.clientX - touchRef.current.lastX, touch.clientY - touchRef.current.lastY);
      touchRef.current.lastX = touch.clientX;
      touchRef.current.lastY = touch.clientY;
      return;
    }

    if (event.touches.length === 2) {
      event.preventDefault();
      const distance = getTouchDistance(event.touches[0], event.touches[1]);
      if (touchRef.current.mode !== 'pinch' || !touchRef.current.distance) {
        touchRef.current = {
          mode: 'pinch',
          lastX: 0,
          lastY: 0,
          distance
        };
        return;
      }

      const midpoint = pointFromClient(
        (event.touches[0].clientX + event.touches[1].clientX) / 2,
        (event.touches[0].clientY + event.touches[1].clientY) / 2
      );
      zoomAtPoint(scaleRef.current * (distance / touchRef.current.distance), midpoint);
      touchRef.current.distance = distance;
    }
  }, [panBy, pointFromClient, zoomAtPoint]);

  const handleTouchEnd = useCallback((event) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchRef.current = {
        mode: 'pan',
        lastX: touch.clientX,
        lastY: touch.clientY,
        distance: 0
      };
      return;
    }

    touchRef.current = {
      mode: 'idle',
      lastX: 0,
      lastY: 0,
      distance: 0
    };
  }, []);

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'touch') return;
    pointerRef.current = {
      active: true,
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!pointerRef.current.active || pointerRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    panBy(event.clientX - pointerRef.current.lastX, event.clientY - pointerRef.current.lastY);
    pointerRef.current.lastX = event.clientX;
    pointerRef.current.lastY = event.clientY;
  }, [panBy]);

  const handlePointerUp = useCallback((event) => {
    if (!pointerRef.current.active || pointerRef.current.pointerId !== event.pointerId) return;
    pointerRef.current = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0
    };
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleWheel = useCallback((event) => {
    if (!imageRef.current) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_STEP);
    zoomAtPoint(scaleRef.current * factor, pointFromClient(event.clientX, event.clientY));
  }, [pointFromClient, zoomAtPoint]);

  const handleConfirm = useCallback(() => {
    const currentImage = imageRef.current;
    const outputCanvas = outputCanvasRef.current;
    const currentViewport = viewportRef.current;
    if (!currentImage || !outputCanvas || isExporting) return;

    const placement = getImagePlacement(
      currentImage,
      currentViewport,
      scaleRef.current,
      offsetRef.current
    );
    if (!placement) return;

    const sourceSize = placement.diameter / placement.displayScale;
    const sourceX = clamp(
      (placement.centerX - placement.radius - placement.x) / placement.displayScale,
      0,
      Math.max(0, currentImage.naturalWidth - sourceSize)
    );
    const sourceY = clamp(
      (placement.centerY - placement.radius - placement.y) / placement.displayScale,
      0,
      Math.max(0, currentImage.naturalHeight - sourceSize)
    );

    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    setIsExporting(true);
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      currentImage,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );
    ctx.restore();

    outputCanvas.toBlob((blob) => {
      setIsExporting(false);
      if (blob) onConfirm?.(blob);
    }, 'image/png');
  }, [isExporting, onConfirm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      ariaLabel="Обрезка аватара"
      className="avatar-crop-modal"
      overlayClassName="avatar-crop-overlay"
      closeOnOverlay={false}
      showCloseButton={false}
    >
      <div className="avatar-crop-shell">
        <div
          ref={stageRef}
          className="avatar-crop-stage"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} className="avatar-crop-canvas" aria-hidden="true" />

          {!image && !imageError && (
            <div className="avatar-crop-status" role="status">
              Загрузка изображения...
            </div>
          )}
          {imageError && (
            <div className="avatar-crop-status" role="alert">
              Не удалось открыть изображение
            </div>
          )}
        </div>

        <div className="avatar-crop-actions">
          <button
            type="button"
            className="avatar-crop-btn avatar-crop-btn--secondary"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button
            type="button"
            className="avatar-crop-btn avatar-crop-btn--primary"
            onClick={handleConfirm}
            disabled={!image || isExporting}
          >
            {isExporting ? 'Готовим...' : 'Готово'}
          </button>
        </div>
      </div>

      <canvas ref={outputCanvasRef} hidden />
    </Modal>
  );
}

export default AvatarCropModal;
