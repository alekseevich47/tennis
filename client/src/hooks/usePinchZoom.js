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

/**
 * Управление pinch-zoom + swipe-to-close. Решает C7/C8 (cleanup RAF и таймеров).
 *
 * @param {{ onClose: () => void }} params
 */
export function usePinchZoom({ onClose }) {
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

  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setBgOpacity(1);
    velocityRef.current = { x: 0, y: 0 };
    isSwipingToCloseRef.current = false;
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

      if (
        currentScale === MIN_SCALE ||
        isSwipingToCloseRef.current ||
        nextY > limit ||
        nextY < -limit
      ) {
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
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    startDistRef.current = 0;

    if (isSwipingToCloseRef.current) {
      if (Math.abs(positionRef.current.y) > SWIPE_CLOSE_THRESHOLD) {
        onClose();
        return;
      }
      setPosition({ x: 0, y: 0 });
      setBgOpacity(1);
      isSwipingToCloseRef.current = false;
      return;
    }

    if (
      scaleRef.current > MIN_SCALE &&
      (Math.abs(velocityRef.current.x) > 0.1 || Math.abs(velocityRef.current.y) > 0.1)
    ) {
      animationFrameRef.current = requestAnimationFrame(animateInertia);
    }
  }, [animateInertia, onClose]);

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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
