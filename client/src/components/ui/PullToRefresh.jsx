// @ts-check
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { hasOpenOverlay } from '../../lib/overlayStack';
import './PullToRefresh.css';

const PULL_DEADZONE = 8;
const PULL_THRESHOLD = 72;
const PULL_MAX = 120;
const REFRESH_HOLD = 56;
const SPRING_MS = 280;

/**
 * @typedef {{ offset: number, refreshing: boolean, springing: boolean }} PullToRefreshState
 */

/** @type {PullToRefreshState} */
const DEFAULT_PULL_STATE = { offset: 0, refreshing: false, springing: false };

const PullToRefreshStateContext = createContext(DEFAULT_PULL_STATE);

/** @returns {PullToRefreshState} */
export function usePullToRefreshState() {
  return useContext(PullToRefreshStateContext);
}

/**
 * iOS-style pull-to-refresh: `header` остаётся на месте, вниз уезжает только
 * `children`; спиннер проявляется в слоте между ними.
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
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [springing, setSpringing] = useState(false);
  const offsetRef = useRef(0);
  const refreshingRef = useRef(false);
  const springTimerRef = useRef(/** @type {number | null} */ (null));
  const gestureRef = useRef(/** @type {null | {
    startY: number,
    startX: number,
    active: boolean,
    blocked: boolean,
    horizontal: boolean
  }} */ (null));
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPull = useCallback((value, withSpring = false) => {
    offsetRef.current = value;
    setSpringing(withSpring);
    setOffset(value);
  }, []);

  const springTo = useCallback(
    (value) => {
      setPull(value, true);
      if (springTimerRef.current) window.clearTimeout(springTimerRef.current);
      springTimerRef.current = window.setTimeout(() => {
        springTimerRef.current = null;
        setSpringing(false);
      }, SPRING_MS);
    },
    [setPull]
  );

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    springTo(REFRESH_HOLD);
    try {
      await onRefreshRef.current?.();
    } catch {
      // ignore
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      springTo(0);
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
        if (offsetRef.current > 0) setPull(0);
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
        if (deltaY < PULL_DEADZONE) return;
        if (el.scrollTop > 1) {
          gesture.blocked = true;
          return;
        }
        gesture.active = true;
      }

      if (el.scrollTop > 1) {
        gesture.blocked = true;
        setPull(0);
        return;
      }

      const raw = Math.max(0, deltaY - PULL_DEADZONE);
      const next =
        raw <= PULL_MAX ? raw * 0.55 : PULL_MAX * 0.55 + (raw - PULL_MAX) * 0.12;
      setPull(next, false);
      if (event.cancelable) event.preventDefault();
    };

    const handleEnd = () => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture || gesture.blocked || gesture.horizontal || !gesture.active) {
        if (!refreshingRef.current && offsetRef.current > 0) springTo(0);
        return;
      }
      if (offsetRef.current >= PULL_THRESHOLD * 0.55) {
        runRefresh();
        return;
      }
      springTo(0);
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
  }, [enabled, scrollRef, runRefresh, setPull, springTo]);

  const progress = Math.min(1, offset / (PULL_THRESHOLD * 0.55));
  const showSpinner = offset > 4 || refreshing;
  const rotation = refreshing ? undefined : progress * 320;

  const pullState = useMemo(
    () => ({ offset, refreshing, springing }),
    [offset, refreshing, springing]
  );

  return (
    <PullToRefreshStateContext.Provider value={pullState}>
      <div className={clsx('pull-to-refresh', className)}>
        {header != null ? (
          <div className="pull-to-refresh__header">{header}</div>
        ) : null}
        <div
          className={clsx(
            'pull-to-refresh__slot',
            springing && 'pull-to-refresh__slot--spring'
          )}
          style={{ height: offset }}
          aria-hidden={!showSpinner}
        >
          <div
            className={clsx(
              'pull-to-refresh__indicator',
              refreshing && 'pull-to-refresh__indicator--spinning'
            )}
            style={{ opacity: showSpinner ? Math.min(1, 0.2 + progress * 0.8) : 0 }}
            role="status"
            aria-live="polite"
            aria-label={refreshing ? 'Обновление' : undefined}
          >
            <span
              className="pull-to-refresh__spinner"
              style={rotation != null ? { transform: `rotate(${rotation}deg)` } : undefined}
            />
          </div>
        </div>
        <div className="pull-to-refresh__content">{children}</div>
      </div>
    </PullToRefreshStateContext.Provider>
  );
}
