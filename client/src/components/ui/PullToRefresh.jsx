// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import './PullToRefresh.css';

const PULL_DEADZONE = 10;
const PULL_THRESHOLD = 64;
const PULL_MAX = 110;

/**
 * iOS-style pull-to-refresh: индикатор внутри скролл-контейнера (`scrollRef`).
 *
 * @param {{
 *   scrollRef: React.RefObject<HTMLElement | null>,
 *   onRefresh: () => void | Promise<void>,
 *   enabled?: boolean
 * }} props
 */
export default function PullToRefresh({ scrollRef, onRefresh, enabled = true }) {
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const offsetRef = useRef(0);
  const refreshingRef = useRef(false);
  const gestureRef = useRef(/** @type {null | {
    startY: number,
    startX: number,
    active: boolean,
    blocked: boolean,
    horizontal: boolean
  }} */ (null));
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPull = useCallback((value) => {
    offsetRef.current = value;
    setOffset(value);
  }, []);

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setPull(PULL_THRESHOLD * 0.55);
    try {
      await onRefreshRef.current?.();
    } catch {
      // ignore
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPull(0);
    }
  }, [setPull]);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = scrollRef?.current;
    if (!el) return undefined;

    const handleStart = (/** @type {TouchEvent} */ event) => {
      if (refreshingRef.current || event.touches.length !== 1) return;
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
      const next = raw <= PULL_MAX ? raw * 0.5 : PULL_MAX * 0.5 + (raw - PULL_MAX) * 0.1;
      setPull(next);
      if (event.cancelable) event.preventDefault();
    };

    const handleEnd = () => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture || gesture.blocked || gesture.horizontal || !gesture.active) {
        if (!refreshingRef.current) setPull(0);
        return;
      }
      if (offsetRef.current >= PULL_THRESHOLD * 0.5) {
        runRefresh();
        return;
      }
      setPull(0);
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
  }, [enabled, scrollRef, runRefresh, setPull]);

  const visible = offset > 2 || refreshing;
  const progress = Math.min(1, offset / (PULL_THRESHOLD * 0.5));
  const rotation = refreshing ? undefined : progress * 300;

  return (
    <div
      className={clsx(
        'pull-to-refresh-indicator',
        visible && 'pull-to-refresh-indicator--visible',
        refreshing && 'pull-to-refresh-indicator--spinning'
      )}
      style={{
        transform: `translate3d(-50%, ${8 + offset * 0.35}px, 0)`,
        opacity: visible ? Math.min(1, 0.25 + progress * 0.75) : 0
      }}
      aria-hidden={!visible}
      role="status"
      aria-live="polite"
      aria-label={refreshing ? 'Обновление' : undefined}
    >
      <span
        className="pull-to-refresh-spinner"
        style={rotation != null ? { transform: `rotate(${rotation}deg)` } : undefined}
      />
    </div>
  );
}
