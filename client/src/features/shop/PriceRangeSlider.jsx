import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import './PriceRangeSlider.css';

const THUMB_HIT = 28;

/**
 * Dual-handle price range with pointer-capture + rAF paint.
 *
 * @param {{
 *   min: number,
 *   max: number,
 *   valueMin: number,
 *   valueMax: number,
 *   onChange: (next: { min: number, max: number }) => void,
 *   step?: number,
 *   className?: string
 * }} props
 */
export default function PriceRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  step = 1,
  className
}) {
  const trackRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const activeThumbRef = useRef(/** @type {'min' | 'max' | null} */ (null));
  const valuesRef = useRef({ min: valueMin, max: valueMax });
  const [dragging, setDragging] = useState(/** @type {'min' | 'max' | null} */ (null));
  const labelId = useId();

  const span = Math.max(max - min, 0);
  const safeMin = span === 0 ? min : Math.min(Math.max(valueMin, min), max);
  const safeMax = span === 0 ? max : Math.min(Math.max(valueMax, min), max);
  const lo = Math.min(safeMin, safeMax);
  const hi = Math.max(safeMin, safeMax);

  valuesRef.current = { min: lo, max: hi };

  const toPercent = useCallback(
    (value) => {
      if (span <= 0) return 0;
      return ((value - min) / span) * 100;
    },
    [min, span]
  );

  const snap = useCallback(
    (raw) => {
      if (span <= 0) return min;
      const stepped = Math.round((raw - min) / step) * step + min;
      return Math.min(max, Math.max(min, stepped));
    },
    [min, max, span, step]
  );

  const valueFromClientX = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track || span <= 0) return min;
      const rect = track.getBoundingClientRect();
      const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
      return snap(min + Math.min(1, Math.max(0, ratio)) * span);
    },
    [min, snap, span]
  );

  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (event) => {
      const thumb = activeThumbRef.current;
      if (!thumb) return;
      const nextValue = valueFromClientX(event.clientX);
      const current = valuesRef.current;
      if (thumb === 'min') {
        onChange({ min: Math.min(nextValue, current.max), max: current.max });
      } else {
        onChange({ min: current.min, max: Math.max(nextValue, current.min) });
      }
    };

    const onUp = () => {
      activeThumbRef.current = null;
      setDragging(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, onChange, valueFromClientX]);

  const startDrag = (thumb, event) => {
    if (span <= 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeThumbRef.current = thumb;
    setDragging(thumb);
    const nextValue = valueFromClientX(event.clientX);
    const current = valuesRef.current;
    if (thumb === 'min') {
      onChange({ min: Math.min(nextValue, current.max), max: current.max });
    } else {
      onChange({ min: current.min, max: Math.max(nextValue, current.min) });
    }
  };

  const leftPct = toPercent(lo);
  const rightPct = toPercent(hi);

  return (
    <div className={clsx('price-range', className)} role="group" aria-labelledby={labelId}>
      <span id={labelId} className="visually-hidden">
        Диапазон цены
      </span>
      <div
        ref={trackRef}
        className={clsx('price-range__track', span <= 0 && 'is-disabled')}
      >
        <div
          className="price-range__fill"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <button
          type="button"
          className={clsx(
            'price-range__thumb',
            'price-range__thumb--min',
            dragging === 'min' && 'is-active'
          )}
          style={{ left: `${leftPct}%` }}
          aria-label={`Цена от ${lo}`}
          aria-valuemin={min}
          aria-valuemax={hi}
          aria-valuenow={lo}
          disabled={span <= 0}
          onPointerDown={(event) => startDrag('min', event)}
        />
        <button
          type="button"
          className={clsx(
            'price-range__thumb',
            'price-range__thumb--max',
            dragging === 'max' && 'is-active'
          )}
          style={{ left: `${rightPct}%` }}
          aria-label={`Цена до ${hi}`}
          aria-valuemin={lo}
          aria-valuemax={max}
          aria-valuenow={hi}
          disabled={span <= 0}
          onPointerDown={(event) => startDrag('max', event)}
        />
      </div>
      {/* hit area spacer for layout */}
      <div className="price-range__hit" style={{ height: THUMB_HIT }} aria-hidden="true" />
    </div>
  );
}
