// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INERTIA_FRAME_MS,
  INERTIA_FRICTION,
  INERTIA_STOP_VELOCITY,
  MAX_SCALE,
  MIN_SCALE,
  SWIPE_CLOSE_THRESHOLD,
  backdropOpacityForDrag,
  clamp,
  getTouchDistance,
  maxPan
} from '../lib/gestures';

const WHEEL_ZOOM_STEP = 0.0015;
const ZOOM_EDGE_CLOSE_ARM_PX = 18;
const ZOOM_EDGE_EPSILON_PX = 2;

/**
 * Управление pinch-zoom + swipe-to-close. Решает C7/C8 (cleanup RAF и таймеров).
 *
 * @param {{
 *   onClose: () => void,
 *   onSwipeCloseStart?: () => void,
 *   onSwipeCloseCancel?: () => void
 * }} params
 */
export function usePinchZoom({ onClose, onSwipeCloseStart, onSwipeCloseCancel }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bgOpacity, setBgOpacity] = useState(1);

  const startTouchRef = useRef({ x: 0, y: 0 });
  const startDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0, time: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(/** @type {number | null} */ (null));
  const isSwipingToCloseRef = useRef(false);
  const pointerDragRef = useRef({ active: false, x: 0, y: 0 });

  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setBgOpacity(1);
    velocityRef.current = { x: 0, y: 0 };
    isSwipingToCloseRef.current = false;
    isDraggingRef.current = false;
    startDistRef.current = 0;
    pointerDragRef.current = { active: false, x: 0, y: 0 };
  }, []);

  // Используем рефы для актуальных значений внутри RAF-цикла без re-binding.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const positionRef = useRef(position);
  positionRef.current = position;

  const animateInertia = useCallback(() => {
    velocityRef.current.x *= INERTIA_FRICTION;
    velocityRef.current.y *= INERTIA_FRICTION;

    setPosition((prev) => {
      const nextX = prev.x + velocityRef.current.x * INERTIA_FRAME_MS;
      const nextY = prev.y + velocityRef.current.y * INERTIA_FRAME_MS;
      const limit = maxPan(scaleRef.current);
      return {
        x: clamp(nextX, -limit, limit),
        y: clamp(nextY, -limit, limit)
      };
    });

    if (
      Math.abs(velocityRef.current.x) > INERTIA_STOP_VELOCITY ||
      Math.abs(velocityRef.current.y) > INERTIA_STOP_VELOCITY
    ) {
      animationFrameRef.current = requestAnimationFrame(animateInertia);
    } else {
      animationFrameRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((/** @type {React.TouchEvent} */ e) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      isSwipingToCloseRef.current = false;
      const touch = e.touches[0];
      startTouchRef.current = {
        x: touch.clientX - positionRef.current.x,
        y: touch.clientY - positionRef.current.y
      };
      lastTouchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now()
      };
      velocityRef.current = { x: 0, y: 0 };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      isSwipingToCloseRef.current = false;
      startDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
    }
  }, []);

  const handleTouchMove = useCallback((/** @type {React.TouchEvent} */ e) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      const now = performance.now();
      const dt = now - lastTouchRef.current.time;

      const nextX = touch.clientX - startTouchRef.current.x;
      const nextY = touch.clientY - startTouchRef.current.y;
      const currentScale = scaleRef.current;
      const limit = maxPan(currentScale);
      const isAtZoomEdge =
        currentScale > MIN_SCALE &&
        limit > 0 &&
        (
          (nextY > limit + ZOOM_EDGE_CLOSE_ARM_PX && positionRef.current.y >= limit - ZOOM_EDGE_EPSILON_PX) ||
          (nextY < -limit - ZOOM_EDGE_CLOSE_ARM_PX && positionRef.current.y <= -limit + ZOOM_EDGE_EPSILON_PX)
        );

      if (currentScale === MIN_SCALE || isSwipingToCloseRef.current || isAtZoomEdge) {
        if (!isSwipingToCloseRef.current) onSwipeCloseStart?.();
        isSwipingToCloseRef.current = true;
        const dragY = nextY;
        setPosition({
          x: currentScale === MIN_SCALE ? 0 : clamp(nextX, -limit, limit),
          y: dragY
        });
        setBgOpacity(backdropOpacityForDrag(dragY));
      } else {
        setPosition({
          x: clamp(nextX, -limit, limit),
          y: clamp(nextY, -limit, limit)
        });
      }

      if (dt > 0 && !isSwipingToCloseRef.current) {
        velocityRef.current = {
          x: (touch.clientX - lastTouchRef.current.x) / dt,
          y: (touch.clientY - lastTouchRef.current.y) / dt
        };
      }

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY, time: now };
    } else if (e.touches.length === 2 && startDistRef.current > 0) {
      const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
      const factor = currentDist / startDistRef.current;
      const newScale = clamp(scaleRef.current * factor, MIN_SCALE, MAX_SCALE);

      setScale(newScale);
      startDistRef.current = currentDist;

      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
        setBgOpacity(1);
        velocityRef.current = { x: 0, y: 0 };
      }
    }
  }, [onSwipeCloseStart]);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    startDistRef.current = 0;

    if (isSwipingToCloseRef.current) {
      const limit = maxPan(scaleRef.current);
      const closeDistance = scaleRef.current > MIN_SCALE
        ? Math.max(0, Math.abs(positionRef.current.y) - limit)
        : Math.abs(positionRef.current.y);

      if (closeDistance > SWIPE_CLOSE_THRESHOLD) {
        onClose();
        return;
      }
      setPosition({
        x: scaleRef.current === MIN_SCALE ? 0 : clamp(positionRef.current.x, -limit, limit),
        y: scaleRef.current === MIN_SCALE ? 0 : clamp(positionRef.current.y, -limit, limit)
      });
      setBgOpacity(1);
      isSwipingToCloseRef.current = false;
      onSwipeCloseCancel?.();
      return;
    }

    if (
      scaleRef.current > MIN_SCALE &&
      (Math.abs(velocityRef.current.x) > 0.1 || Math.abs(velocityRef.current.y) > 0.1)
    ) {
      animationFrameRef.current = requestAnimationFrame(animateInertia);
    }
  }, [animateInertia, onClose, onSwipeCloseCancel]);

  const panBy = useCallback((deltaX, deltaY) => {
    const limit = maxPan(scaleRef.current);
    if (scaleRef.current <= MIN_SCALE || limit <= 0) return;
    setPosition((prev) => ({
      x: clamp(prev.x + deltaX, -limit, limit),
      y: clamp(prev.y + deltaY, -limit, limit)
    }));
  }, []);

  const handleWheel = useCallback((/** @type {{ deltaY: number }} */ e) => {
    const nextScale = clamp(
      scaleRef.current - e.deltaY * WHEEL_ZOOM_STEP,
      MIN_SCALE,
      MAX_SCALE
    );

    setScale(nextScale);
    if (nextScale === MIN_SCALE) {
      setPosition({ x: 0, y: 0 });
      setBgOpacity(1);
      velocityRef.current = { x: 0, y: 0 };
    } else {
      const limit = maxPan(nextScale);
      setPosition((prev) => ({
        x: clamp(prev.x, -limit, limit),
        y: clamp(prev.y, -limit, limit)
      }));
    }
  }, []);

  const handlePointerDown = useCallback((/** @type {React.PointerEvent} */ e) => {
    if (e.pointerType === 'touch' || scaleRef.current <= MIN_SCALE) return;
    pointerDragRef.current = { active: true, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((/** @type {React.PointerEvent} */ e) => {
    if (!pointerDragRef.current.active) return;
    const deltaX = e.clientX - pointerDragRef.current.x;
    const deltaY = e.clientY - pointerDragRef.current.y;
    pointerDragRef.current = { active: true, x: e.clientX, y: e.clientY };
    panBy(deltaX, deltaY);
  }, [panBy]);

  const handlePointerUp = useCallback((/** @type {React.PointerEvent} */ e) => {
    if (!pointerDragRef.current.active) return;
    pointerDragRef.current = { active: false, x: 0, y: 0 };
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  // Глобальный cleanup на unmount (фикс C8).
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return {
    scale,
    position,
    bgOpacity,
    reset,
    panBy,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
