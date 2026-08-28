import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  loadFramePresets,
  normalizeHexColor,
  saveFramePresets
} from './postRichText';

/**
 * HSV helpers for circular palette.
 * @param {number} h 0-360
 * @param {number} s 0-1
 * @param {number} v 0-1
 * @returns {string}
 */
function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * @param {string} hex
 * @returns {{ h: number, s: number, v: number } | null}
 */
function hexToHsv(hex) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

/**
 * @param {{
 *   color: string,
 *   onChange: (hex: string) => void,
 *   onApply: (hex: string) => void,
 *   onClose: () => void,
 *   applyLabel?: string
 * }} props
 */
function FrameColorPicker({ color, onChange, onApply, onClose, applyLabel = 'Вставить рамку' }) {
  const wheelRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [hexInput, setHexInput] = useState(color);
  const [presets, setPresets] = useState(() => loadFramePresets());
  const hsv = useMemo(() => hexToHsv(color) || { h: 0, s: 1, v: 1 }, [color]);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const setFromWheel = (clientX, clientY) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const radius = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const s = Math.min(1, dist / radius);
    let h = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (h < 0) h += 360;
    // atan2: 0° = right; CSS conic uses from 90deg so hues align.
    const next = hsvToHex(h, s, 1);
    onChange(next);
    setHexInput(next);
  };

  const handlePointer = (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    setFromWheel(e.clientX, e.clientY);

    const move = (ev) => setFromWheel(ev.clientX, ev.clientY);
    const up = () => {
      target.releasePointerCapture?.(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };

  const commitHexInput = () => {
    const next = normalizeHexColor(hexInput);
    if (!next) {
      setHexInput(color);
      return;
    }
    onChange(next);
    setHexInput(next);
  };

  const addPreset = () => {
    const next = normalizeHexColor(color);
    if (!next) return;
    setPresets((current) => {
      if (current.includes(next)) return current;
      const updated = [...current, next].slice(0, 12);
      saveFramePresets(updated);
      return updated;
    });
  };

  const removePreset = (hex) => {
    setPresets((current) => {
      const updated = current.filter((item) => item !== hex);
      saveFramePresets(updated);
      return updated;
    });
  };

  const markerStyle = {
    left: `${50 + Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 50}%`,
    top: `${50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 50}%`
  };

  return (
    <div
      className="frame-color-picker"
      role="dialog"
      aria-label="Цвет анимационной рамки"
      onMouseDown={(e) => {
        const target = e.target;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.closest('input, textarea'))
        ) {
          return;
        }
        e.preventDefault();
      }}
    >
      <div className="frame-color-picker__row">
        <div className="frame-color-picker__wheel-col">
          <div
            ref={wheelRef}
            className="frame-color-picker__wheel"
            onPointerDown={handlePointer}
            role="slider"
            aria-label="Цветовой круг"
            aria-valuetext={color}
            tabIndex={0}
          >
            <span className="frame-color-picker__marker" style={markerStyle} />
            <span className="frame-color-picker__center" style={{ background: color }} />
          </div>
          <div className="frame-color-picker__hex-row">
            <input
              className="frame-color-picker__hex"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value.toUpperCase())}
              onBlur={commitHexInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitHexInput();
                }
              }}
              aria-label="HEX-код цвета"
              spellCheck={false}
              maxLength={7}
            />
            <button
              type="button"
              className="frame-color-picker__copy"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(color);
                } catch {
                  /* ignore */
                }
              }}
            >
              Копировать
            </button>
          </div>
        </div>

        <div className="frame-color-picker__presets">
          <div className="frame-color-picker__presets-title">Цвета</div>
          <div className="frame-color-picker__presets-list">
            {presets.map((hex) => (
              <button
                key={hex}
                type="button"
                className={clsx('frame-color-picker__swatch', hex === color && 'is-active')}
                style={{ background: hex }}
                aria-label={`Цвет ${hex}`}
                title={`${hex} · удерживайте, чтобы удалить`}
                onClick={() => {
                  onChange(hex);
                  setHexInput(hex);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  removePreset(hex);
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  const timer = window.setTimeout(() => {
                    removePreset(hex);
                  }, 550);
                  const clear = () => {
                    window.clearTimeout(timer);
                    e.currentTarget.removeEventListener('pointerup', clear);
                    e.currentTarget.removeEventListener('pointerleave', clear);
                    e.currentTarget.removeEventListener('pointercancel', clear);
                  };
                  e.currentTarget.addEventListener('pointerup', clear);
                  e.currentTarget.addEventListener('pointerleave', clear);
                  e.currentTarget.addEventListener('pointercancel', clear);
                }}
              />
            ))}
            <button
              type="button"
              className="frame-color-picker__swatch frame-color-picker__swatch--add"
              aria-label="Добавить текущий цвет"
              onClick={addPreset}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="frame-color-picker__actions">
        <button type="button" className="frame-color-picker__ghost" onClick={onClose}>
          Отмена
        </button>
        <button
          type="button"
          className="frame-color-picker__apply"
          onClick={() => {
            const next = normalizeHexColor(hexInput) || color;
            onChange(next);
            onApply(next);
          }}
        >
          {applyLabel}
        </button>
      </div>
    </div>
  );
}

export default FrameColorPicker;
