// @ts-check
import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Скролл-область онбординг-карточки: нативный scrollbar скрыт, кастомный серый thumb
 * плавно расширяется на hover / во время скролла и сужается через 1с простоя.
 *
 * @param {{ children: React.ReactNode, className?: string }} props
 */
export default function OnboardingCardScroll({ children, className }) {
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const railRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const hoverRef = useRef(false);
  const idleTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const dragRef = useRef(/** @type {{ startY: number, startTop: number } | null} */ (null));
  const thumbHeightRef = useRef(28);

  const [expanded, setExpanded] = useState(false);
  const [thumb, setThumb] = useState({ top: 0, height: 0, needed: false });

  const clearIdle = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleCollapse = useCallback(() => {
    clearIdle();
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      if (!hoverRef.current && !dragRef.current) setExpanded(false);
    }, 1000);
  }, [clearIdle]);

  const syncThumb = useCallback(() => {
    const el = scrollRef.current;
    const rail = railRef.current;
    if (!el || !rail) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const trackHeight = rail.clientHeight;
    const needed = scrollHeight > clientHeight + 1 && trackHeight > 0;

    if (!needed) {
      thumbHeightRef.current = 0;
      setThumb({ top: 0, height: 0, needed: false });
      return;
    }

    const height = Math.max(28, (clientHeight / scrollHeight) * trackHeight);
    thumbHeightRef.current = height;
    const maxTop = Math.max(0, trackHeight - height);
    const maxScroll = scrollHeight - clientHeight;
    const top = maxScroll <= 0 || maxTop <= 0 ? 0 : (scrollTop / maxScroll) * maxTop;
    setThumb({ top, height, needed: true });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const onScroll = () => {
      syncThumb();
      setExpanded(true);
      if (!hoverRef.current) scheduleCollapse();
    };

    const onEnter = () => {
      hoverRef.current = true;
      clearIdle();
      setExpanded(true);
    };
    const onLeave = () => {
      hoverRef.current = false;
      if (!dragRef.current) scheduleCollapse();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    const frame = requestAnimationFrame(() => syncThumb());
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => syncThumb()) : null;
    ro?.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      clearIdle();
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      ro?.disconnect();
    };
  }, [clearIdle, scheduleCollapse, syncThumb]);

  useEffect(() => {
    const onMove = (/** @type {PointerEvent} */ e) => {
      const drag = dragRef.current;
      const el = scrollRef.current;
      const rail = railRef.current;
      if (!drag || !el || !rail) return;

      const trackHeight = rail.clientHeight;
      const thumbHeight = thumbHeightRef.current || 28;
      const maxTop = Math.max(0, trackHeight - thumbHeight);
      const nextTop = Math.min(maxTop, Math.max(0, drag.startTop + (e.clientY - drag.startY)));
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0 || maxTop <= 0) return;
      el.scrollTop = (nextTop / maxTop) * maxScroll;
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      if (!hoverRef.current) scheduleCollapse();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [scheduleCollapse]);

  const onThumbPointerDown = (/** @type {React.PointerEvent<HTMLDivElement>} */ e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startY: e.clientY, startTop: thumb.top };
    clearIdle();
    setExpanded(true);
  };

  return (
    <div
      className={[
        'onboarding-card__scroll-wrap',
        expanded ? 'onboarding-card__scroll-wrap--expanded' : '',
        className || ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div ref={scrollRef} className="onboarding-card__scroll">
        {children}
      </div>
      <div
        ref={railRef}
        className={`onboarding-card__rail${thumb.needed ? '' : ' onboarding-card__rail--hidden'}`}
        aria-hidden="true"
        onMouseEnter={() => {
          if (!thumb.needed) return;
          hoverRef.current = true;
          clearIdle();
          setExpanded(true);
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
          if (!dragRef.current) scheduleCollapse();
        }}
      >
        {thumb.needed ? (
          <div
            className="onboarding-card__thumb"
            style={{ transform: `translateY(${thumb.top}px)`, height: thumb.height }}
            onPointerDown={onThumbPointerDown}
          />
        ) : null}
      </div>
    </div>
  );
}
