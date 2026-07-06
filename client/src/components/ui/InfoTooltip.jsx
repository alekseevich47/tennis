import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import './InfoTooltip.css';

/**
 * @param {{ text: string, children: React.ReactNode, className?: string }} props
 */
export default function InfoTooltip({ text, children, className }) {
  const rootRef = useRef(null);
  const bubbleRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    return undefined;
  }, [open]);

  const handleTransitionEnd = useCallback(
    (event) => {
      if (event.target !== bubbleRef.current) return;
      if (event.propertyName !== 'opacity') return;
      if (open) return;
      setMounted(false);
    },
    [open]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      close();
    };

    const handleScroll = () => {
      close();
    };

    const modalBody = rootRef.current?.closest('.ui-modal-overlay')?.querySelector('.ui-modal-body');

    document.addEventListener('pointerdown', handlePointerDown);
    modalBody?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      modalBody?.removeEventListener('scroll', handleScroll);
    };
  }, [open, close]);

  return (
    <span ref={rootRef} className={clsx('info-tooltip', className)}>
      <button
        type="button"
        className="info-tooltip__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {children}
      </button>
      {mounted && (
        <span
          ref={bubbleRef}
          role="tooltip"
          className={clsx('info-tooltip__bubble', visible && 'info-tooltip__bubble--visible')}
          onTransitionEnd={handleTransitionEnd}
        >
          {text}
        </span>
      )}
    </span>
  );
}
