// @ts-check
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const LONG_PRESS_DURATION_MS = 1000;
export const LONG_PRESS_MOVE_CANCEL_PX = 10;

const RING_SIZE = 32;
const RING_STROKE = 2.5;

/**
 * Стиль «приближение + затемнение» карточки во время long-press.
 * @param {number} progress 0..1
 * @returns {React.CSSProperties | undefined}
 */
export function getLongPressCardStyle(progress) {
  if (!(progress > 0)) return undefined;
  return {
    transform: `scale(${1 + progress * 0.02})`,
    filter: `brightness(${1 - progress * 0.08})`,
    transition: 'none'
  };
}

/**
 * SVG-кольцо прогресса long-press в точке нажатия.
 * @param {{
 *   visible?: boolean,
 *   progress?: number,
 *   x?: number,
 *   y?: number
 * }} props
 */
export function LongPressRing({ visible = false, progress = 0, x = 0, y = 0 }) {
  if (!visible || progress <= 0 || typeof document === 'undefined') return null;

  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  const half = RING_SIZE / 2;

  return createPortal(
    React.createElement(
      'svg',
      {
        className: 'long-press-ring',
        width: RING_SIZE,
        height: RING_SIZE,
        viewBox: `0 0 ${RING_SIZE} ${RING_SIZE}`,
        style: {
          left: x - half,
          top: y - half
        },
        'aria-hidden': true
      },
      React.createElement('circle', {
        className: 'long-press-ring__track',
        cx: half,
        cy: half,
        r,
        fill: 'none',
        strokeWidth: RING_STROKE
      }),
      React.createElement('circle', {
        className: 'long-press-ring__progress',
        cx: half,
        cy: half,
        r,
        fill: 'none',
        strokeWidth: RING_STROKE,
        strokeLinecap: 'round',
        strokeDasharray: circumference,
        strokeDashoffset: offset,
        transform: `rotate(-90 ${half} ${half})`
      })
    ),
    document.body
  );
}

/**
 * Хук долгого нажатия (pointer events).
 *
 * @param {{
 *   enabled?: boolean,
 *   onLongPress?: (point: { x: number, y: number }) => void,
 *   durationMs?: number,
 *   moveCancelPx?: number
 * }} [options]
 * @returns {{
 *   handlers: {
 *     onPointerDown: (e: React.PointerEvent) => void,
 *     onPointerMove: (e: React.PointerEvent) => void,
 *     onPointerUp: (e: React.PointerEvent) => void,
 *     onPointerCancel: (e: React.PointerEvent) => void,
 *     onPointerLeave: (e: React.PointerEvent) => void,
 *     onContextMenu: (e: React.MouseEvent) => void,
 *     onClick: (e: React.MouseEvent) => void
 *   },
 *   isPressing: boolean,
 *   progress: number,
 *   point: { x: number, y: number } | null,
 *   cardStyle: React.CSSProperties | undefined,
 *   ringProps: { visible: boolean, progress: number, x: number, y: number }
 * }}
 */
export function useLongPress({
  enabled = true,
  onLongPress,
  durationMs = LONG_PRESS_DURATION_MS,
  moveCancelPx = LONG_PRESS_MOVE_CANCEL_PX
} = {}) {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [point, setPoint] = useState(/** @type {{ x: number, y: number } | null} */ (null));

  const startRef = useRef(/** @type {{ x: number, y: number, time: number } | null} */ (null));
  const rafRef = useRef(/** @type {number | null} */ (null));
  const timeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const suppressClickRef = useRef(false);
  const triggeredRef = useRef(false);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;
  const moveCancelRef = useRef(moveCancelPx);
  moveCancelRef.current = moveCancelPx;

  const clearTimers = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetPress = useCallback(() => {
    clearTimers();
    startRef.current = null;
    triggeredRef.current = false;
    setIsPressing(false);
    setProgress(0);
    setPoint(null);
  }, [clearTimers]);

  const fireLongPress = useCallback((x, y) => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    suppressClickRef.current = true;
    clearTimers();
    setIsPressing(false);
    setProgress(0);
    setPoint(null);
    startRef.current = null;
    onLongPressRef.current?.({ x, y });
  }, [clearTimers]);

  const onPointerDown = useCallback((/** @type {React.PointerEvent} */ e) => {
    if (!enabled) return;
    if (e.button != null && e.button !== 0) return;

    const x = e.clientX;
    const y = e.clientY;
    const startedAt = performance.now();

    startRef.current = { x, y, time: startedAt };
    triggeredRef.current = false;
    setIsPressing(true);
    setProgress(0);
    setPoint({ x, y });

    const tick = () => {
      const start = startRef.current;
      if (!start) return;
      const elapsed = performance.now() - start.time;
      const next = Math.min(1, elapsed / durationRef.current);
      setProgress(next);
      if (next < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    timeoutRef.current = setTimeout(() => {
      const start = startRef.current;
      if (!start) return;
      fireLongPress(start.x, start.y);
    }, durationRef.current);
  }, [enabled, fireLongPress]);

  const onPointerMove = useCallback((/** @type {React.PointerEvent} */ e) => {
    const start = startRef.current;
    if (!start || triggeredRef.current) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > moveCancelRef.current) {
      resetPress();
    }
  }, [resetPress]);

  const onPointerUp = useCallback(() => {
    if (!startRef.current && !isPressing) return;
    if (!triggeredRef.current) {
      resetPress();
    } else {
      clearTimers();
      startRef.current = null;
    }
  }, [clearTimers, isPressing, resetPress]);

  const onPointerCancel = useCallback(() => {
    resetPress();
  }, [resetPress]);

  const onPointerLeave = useCallback(() => {
    if (!startRef.current || triggeredRef.current) return;
    resetPress();
  }, [resetPress]);

  const onContextMenu = useCallback((/** @type {React.MouseEvent} */ e) => {
    if (!enabled) return;
    e.preventDefault();
  }, [enabled]);

  const onClick = useCallback((/** @type {React.MouseEvent} */ e) => {
    if (!suppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  useEffect(() => () => {
    clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (enabled) return;
    resetPress();
    suppressClickRef.current = false;
  }, [enabled, resetPress]);

  const ringPoint = point || { x: 0, y: 0 };

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
      onContextMenu,
      onClick
    },
    isPressing,
    progress,
    point,
    cardStyle: getLongPressCardStyle(progress),
    ringProps: {
      visible: isPressing && progress > 0,
      progress,
      x: ringPoint.x,
      y: ringPoint.y
    }
  };
}
