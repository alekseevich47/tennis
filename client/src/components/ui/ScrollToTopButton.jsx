import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import './ScrollToTopButton.css';

const DEFAULT_SHOW_AFTER = 120;

/**
 * Кнопка «наверх» чуть выше BottomNav (снизу справа).
 * @param {{
 *   scrollRef: React.RefObject<HTMLElement | null>,
 *   showAfterPx?: number,
 *   className?: string
 * }} props
 */
export default function ScrollToTopButton({
  scrollRef,
  showAfterPx = DEFAULT_SHOW_AFTER,
  className
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return undefined;

    const sync = () => {
      setVisible(el.scrollTop > showAfterPx);
    };

    sync();
    el.addEventListener('scroll', sync, { passive: true });
    return () => el.removeEventListener('scroll', sync);
  }, [scrollRef, showAfterPx]);

  const handleClick = () => {
    const el = scrollRef?.current;
    if (!el) return;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      el.scrollTop = 0;
    }
  };

  return (
    <button
      type="button"
      className={clsx('scroll-to-top-btn', visible && 'scroll-to-top-btn--visible', className)}
      onClick={handleClick}
      aria-label="Наверх"
      tabIndex={visible ? 0 : -1}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 14.5L12 8.5L18 14.5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
