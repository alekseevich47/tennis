// @ts-check
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const LONG_PRESS_DURATION_MS = 500;
export const LONG_PRESS_MOVE_CANCEL_PX = 10;

const RING_SIZE = 32;
const RING_STROKE = 2.5;
/** Смещение кольца вправо-вверх от точки касания (палец не перекрывает). */
const RING_OFFSET_X = 28;
const RING_OFFSET_Y = -40;

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
  if (!visible || typeof document === 'undefined') return null;

  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);
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
          left: x - half + RING_OFFSET_X,
          top: y - half + RING_OFFSET_Y
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
  const resetPressRef = useRef(/** @type {(() => void) | null} */ (null));

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

  const scrollGuardRef = useRef(
    /** @type {{ onScroll: () => void, onTouchMove: (e: TouchEvent) => void } | null} */ (null)
  );

  const detachScrollGuards = useCallback(() => {
    if (typeof window === 'undefined') return;
    const guards = scrollGuardRef.current;
    if (!guards) return;
    window.removeEventListener('scroll', guards.onScroll, true);
    window.removeEventListener('wheel', guards.onScroll, true);
    window.removeEventListener('touchmove', guards.onTouchMove, true);
    scrollGuardRef.current = null;
  }, []);

  const resetPress = useCallback(() => {
    detachScrollGuards();
    clearTimers();
    startRef.current = null;
    triggeredRef.current = false;
    setIsPressing(false);
    setProgress(0);
    setPoint(null);
  }, [clearTimers, detachScrollGuards]);

  resetPressRef.current = resetPress;

  const attachScrollGuards = useCallback(() => {
    if (typeof window === 'undefined') return;
    detachScrollGuards();
    const onScroll = () => {
      resetPressRef.current?.();
    };
    // touchmove на window: в webview при скролле pointermove на карточке часто не приходит
    const onTouchMove = (/** @type {TouchEvent} */ e) => {
      const t = e.touches?.[0];
      if (!t) return;
      const start = startRef.current;
      if (!start || triggeredRef.current) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.hypot(dx, dy) > moveCancelRef.current) {
        resetPressRef.current?.();
      }
    };
    scrollGuardRef.current = { onScroll, onTouchMove };
    // capture: ловим скролл любого контейнера (лента)
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('wheel', onScroll, true);
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
  }, [detachScrollGuards]);

  const fireLongPress = useCallback((x, y) => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    suppressClickRef.current = true;
    detachScrollGuards();
    clearTimers();
    setIsPressing(false);
    setProgress(0);
    setPoint(null);
    startRef.current = null;
    onLongPressRef.current?.({ x, y });
  }, [clearTimers, detachScrollGuards]);

  const cancelIfMoved = useCallback((clientX, clientY) => {
    const start = startRef.current;
    if (!start || triggeredRef.current) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (Math.hypot(dx, dy) > moveCancelRef.current) {
      resetPress();
    }
  }, [resetPress]);

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

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore: capture может быть недоступен */
    }

    attachScrollGuards();

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
  }, [attachScrollGuards, enabled, fireLongPress]);

  const onPointerMove = useCallback((/** @type {React.PointerEvent} */ e) => {
    cancelIfMoved(e.clientX, e.clientY);
  }, [cancelIfMoved]);

  const onPointerUp = useCallback((/** @type {React.PointerEvent} */ e) => {
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (!startRef.current && !isPressing) return;
    if (!triggeredRef.current) {
      resetPress();
    } else {
      detachScrollGuards();
      clearTimers();
      startRef.current = null;
    }
  }, [clearTimers, detachScrollGuards, isPressing, resetPress]);

  const onPointerCancel = useCallback(() => {
    resetPress();
  }, [resetPress]);

  /** Не сбрасываем по leave: на тач/scale leave ложный; отмена — move / scroll / up / cancel. */
  const onPointerLeave = useCallback(() => {}, []);

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
    detachScrollGuards();
    clearTimers();
  }, [clearTimers, detachScrollGuards]);

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
      visible: isPressing,
      progress,
      x: ringPoint.x,
      y: ringPoint.y
    }
  };
}
