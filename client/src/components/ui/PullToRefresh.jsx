// @ts-check
import { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { hasOpenOverlay } from '../../lib/overlayStack';
import './PullToRefresh.css';

const PULL_DEADZONE = 8;
const PULL_THRESHOLD = 72;
const PULL_MAX = 120;
const REFRESH_HOLD = 56;
const SPRING_MS = 280;
const MIN_REFRESH_MS = 420;
const SPRING_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * iOS-style pull-to-refresh: `header` остаётся на месте, вниз уезжает только
 * `children`; спиннер проявляется в слоте между ними.
 *
 * Offset пишется в DOM напрямую (без setState на каждый touchmove), чтобы
 * лента не ререндерилась на каждый пиксель жеста.
 *
 * Вешать внутрь скролл-контейнера; `scrollRef` — сам контейнер.
 *
 * @param {{
 *   scrollRef: React.RefObject<HTMLElement | null>,
 *   onRefresh: () => void | Promise<void>,
 *   enabled?: boolean,
 *   header?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string
 * }} props
 */
export default function PullToRefresh({
  scrollRef,
  onRefresh,
  enabled = true,
  header = null,
  children,
  className
}) {
  const offsetRef = useRef(0);
  const refreshingRef = useRef(false);
  const springTimerRef = useRef(/** @type {number | null} */ (null));
  const slotRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const indicatorRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const spinnerRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const gestureRef = useRef(/** @type {null | {
    startY: number,
    startX: number,
    active: boolean,
    blocked: boolean,
    horizontal: boolean
  }} */ (null));
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const applyVisual = useCallback((value, { spring = false, spinning = false } = {}) => {
    offsetRef.current = value;
    const slot = slotRef.current;
    const indicator = indicatorRef.current;
    const spinner = spinnerRef.current;
    if (!slot || !indicator || !spinner) return;

    slot.style.height = `${value}px`;
    slot.style.transition = spring ? `height ${SPRING_MS}ms ${SPRING_EASING}` : 'none';

    const progress = Math.min(1, value / (PULL_THRESHOLD * 0.55));
    const show = value > 4 || spinning;
    indicator.style.opacity = show ? String(Math.min(1, 0.2 + progress * 0.8)) : '0';
    indicator.style.transition = spring
      ? `opacity ${SPRING_MS}ms ease`
      : 'opacity 0.15s ease';

    if (spinning) {
      indicator.classList.add('pull-to-refresh__indicator--spinning');
      spinner.style.transform = '';
      indicator.setAttribute('aria-label', 'Обновление');
    } else {
      indicator.classList.remove('pull-to-refresh__indicator--spinning');
      spinner.style.transform = `rotate(${progress * 320}deg)`;
      indicator.removeAttribute('aria-label');
    }
  }, []);

  const springTo = useCallback(
    (value, { spinning = false } = {}) => {
      applyVisual(value, { spring: true, spinning });
      if (springTimerRef.current) window.clearTimeout(springTimerRef.current);
      springTimerRef.current = window.setTimeout(() => {
        springTimerRef.current = null;
      }, SPRING_MS);
    },
    [applyVisual]
  );

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    springTo(REFRESH_HOLD, { spinning: true });
    const startedAt = Date.now();
    try {
      await onRefreshRef.current?.();
    } catch {
      // ignore
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_REFRESH_MS) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, MIN_REFRESH_MS - elapsed);
        });
      }
      refreshingRef.current = false;
      springTo(0, { spinning: false });
    }
  }, [springTo]);

  useEffect(() => {
    return () => {
      if (springTimerRef.current) window.clearTimeout(springTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = scrollRef?.current;
    if (!el) return undefined;

    const handleStart = (/** @type {TouchEvent} */ event) => {
      if (refreshingRef.current || event.touches.length !== 1) return;
      if (hasOpenOverlay()) {
        gestureRef.current = null;
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      gestureRef.current = {
        startY: touch.clientY,
        startX: touch.clientX,
        active: false,
        blocked: el.scrollTop > 1,
        horizontal: false
      };
    };

    const handleMove = (/** @type {TouchEvent} */ event) => {
      const gesture = gestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch || refreshingRef.current) return;
      if (hasOpenOverlay()) {
        gesture.blocked = true;
        if (offsetRef.current > 0) applyVisual(0);
        return;
      }
      if (gesture.blocked || gesture.horizontal) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (!gesture.active) {
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          gesture.horizontal = true;
          return;
        }
        // Перехватить native overscroll до deadzone, иначе webview съедает жест.
        if (deltaY > 0 && el.scrollTop <= 1 && event.cancelable) {
          event.preventDefault();
        }
        if (deltaY < PULL_DEADZONE) return;
        if (el.scrollTop > 1 && offsetRef.current <= 0) {
          gesture.blocked = true;
          return;
        }
        gesture.active = true;
      }

      const raw = Math.max(0, deltaY - PULL_DEADZONE);
      const next =
        raw <= PULL_MAX ? raw * 0.55 : PULL_MAX * 0.55 + (raw - PULL_MAX) * 0.12;
      applyVisual(next, { spring: false, spinning: false });
      if (event.cancelable) event.preventDefault();
    };

    const handleEnd = () => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture || gesture.blocked || gesture.horizontal || !gesture.active) {
        if (!refreshingRef.current && offsetRef.current > 0) {
          springTo(0, { spinning: false });
        }
        return;
      }
      if (offsetRef.current >= PULL_THRESHOLD * 0.55) {
        runRefresh();
        return;
      }
      springTo(0, { spinning: false });
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: false });
    el.addEventListener('touchend', handleEnd, { passive: true });
    el.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleEnd);
      el.removeEventListener('touchcancel', handleEnd);
    };
  }, [enabled, scrollRef, runRefresh, applyVisual, springTo]);

  return (
    <div className={clsx('pull-to-refresh', className)}>
      {header != null ? (
        <div className="pull-to-refresh__header">{header}</div>
      ) : null}
      <div
        ref={slotRef}
        className="pull-to-refresh__slot"
        style={{ height: 0 }}
        aria-hidden="true"
      >
        <div
          ref={indicatorRef}
          className="pull-to-refresh__indicator"
          style={{ opacity: 0 }}
          role="status"
          aria-live="polite"
        >
          <span ref={spinnerRef} className="pull-to-refresh__spinner" />
        </div>
      </div>
      <div className="pull-to-refresh__content">{children}</div>
    </div>
  );
}
