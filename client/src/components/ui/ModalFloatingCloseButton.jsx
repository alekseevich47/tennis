// @ts-check
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import './ModalFloatingCloseButton.css';

/**
 * Плавающий ✕ с liquid-glass: проявляется при скролле body модалки и
 * сливается с основной кнопкой закрытия, когда та снова в видимости.
 * Рендерится в `.ui-modal-content` (не в scroll-body).
 *
 * @param {{
 *   isOpen?: boolean,
 *   anchorRef: React.RefObject<HTMLElement | null>,
 *   onClose?: () => void,
 *   className?: string
 * }} props
 */
export default function ModalFloatingCloseButton({
  isOpen = true,
  anchorRef,
  onClose,
  className
}) {
  const filterId = useId().replace(/:/g, '');
  const [opacity, setOpacity] = useState(0);
  const [host, setHost] = useState(/** @type {HTMLElement | null} */ (null));

  useEffect(() => {
    if (!isOpen) {
      setOpacity(0);
      setHost(null);
      return undefined;
    }

    let cancelled = false;
    let io = /** @type {IntersectionObserver | null} */ (null);

    const setup = () => {
      const anchor = anchorRef?.current;
      if (!anchor || cancelled) return false;

      const modal = anchor.closest('.ui-modal-content');
      const root = anchor.closest('.ui-modal-body');
      if (!(modal instanceof HTMLElement) || !(root instanceof HTMLElement)) {
        return false;
      }

      setHost(modal);

      const thresholds = [];
      for (let i = 0; i <= 20; i += 1) thresholds.push(i / 20);

      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          const next = Math.max(0, Math.min(1, 1 - entry.intersectionRatio));
          setOpacity(next);
        },
        { root, threshold: thresholds }
      );
      io.observe(anchor);
      return true;
    };

    // Якорь может появиться на кадр позже открытия модалки.
    if (!setup()) {
      const raf = window.requestAnimationFrame(() => {
        setup();
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(raf);
        io?.disconnect();
      };
    }

    return () => {
      cancelled = true;
      io?.disconnect();
    };
  }, [isOpen, anchorRef]);

  if (!host || !isOpen) return null;

  const visible = opacity > 0.02;

  return createPortal(
    <div
      className={clsx(
        'modal-floating-close',
        visible && 'modal-floating-close--visible',
        className
      )}
      style={{ opacity }}
      aria-hidden={!visible}
    >
      <svg
        className="modal-floating-close__svg-defs"
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
      >
        <filter
          id={`modal-close-glass-${filterId}`}
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.01"
            numOctaves="1"
            seed="5"
            result="turbulence"
          />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting
            in="softMap"
            surfaceScale="5"
            specularConstant="1"
            specularExponent="100"
            lightingColor="white"
            result="specLight"
          >
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite
            in="specLight"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="litImage"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softMap"
            scale="120"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <button
        type="button"
        className="modal-floating-close__btn"
        aria-label="Закрыть"
        tabIndex={visible ? 0 : -1}
        onClick={onClose}
        style={{
          '--modal-close-glass-filter': `url(#modal-close-glass-${filterId})`
        }}
      >
        <span className="modal-floating-close__effect" aria-hidden="true" />
        <span className="modal-floating-close__tint" aria-hidden="true" />
        <span className="modal-floating-close__shine" aria-hidden="true" />
        <span className="modal-floating-close__label" aria-hidden="true">
          ✕
        </span>
      </button>
    </div>,
    host
  );
}
