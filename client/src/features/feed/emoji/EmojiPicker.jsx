import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import clsx from 'clsx';
import { EMOJI_CATEGORIES } from './emojiData';
import { pushRecentEmoji, readRecentEmojis } from './emojiRecent';
import { registerOverlay } from '../../../lib/overlayStack';
import './EmojiPicker.css';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  );
}

function EmptyClockIcon() {
  return (
    <svg className="emoji-picker__empty-icon" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M24 16v9.2L30.5 29"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {{
 *   open: boolean,
 *   mode: 'field' | 'toolbar',
 *   anchorRect: DOMRect | null,
 *   modalRect?: DOMRect | null,
 *   onClose: () => void,
 *   onPick: (emoji: string) => void
 * }} props
 */
function EmojiPicker({ open, mode, anchorRect, modalRect = null, onClose, onPick }) {
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [recent, setRecent] = useState(() => readRecentEmojis());
  const [activeCategory, setActiveCategory] = useState('recent');
  const titleId = useId();
  const closingRef = useRef(false);

  const categories = useMemo(
    () => [{ id: 'recent', label: 'Недавние', icon: '🕒', emojis: recent }, ...EMOJI_CATEGORIES],
    [recent]
  );

  const activeEmojis = useMemo(() => {
    const found = categories.find((c) => c.id === activeCategory);
    return found?.emojis || [];
  }, [activeCategory, categories]);

  const layout = useMemo(() => {
    if (!anchorRect) return null;
    if (mode === 'field') {
      const size = Math.min(280, Math.max(220, Math.round(window.innerWidth * 0.72)));
      const top = Math.round(anchorRect.top);
      const left = Math.round(anchorRect.right - size);
      return {
        top: Math.max(8, top),
        left: Math.max(8, left),
        width: size,
        height: size,
        transformOrigin: '100% 0%'
      };
    }
    const shell = modalRect;
    const width = shell ? Math.round(shell.width) : Math.round(window.innerWidth - 16);
    const height = shell
      ? Math.round(shell.height / 3)
      : Math.round(Math.min(window.innerHeight * 0.33, 280));
    const left = shell ? Math.round(shell.left) : 8;
    const top = Math.round(anchorRect.top);
    return {
      top: Math.max(8, top),
      left,
      width,
      height: Math.max(180, height),
      transformOrigin: '50% 0%'
    };
  }, [anchorRect, modalRect, mode]);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const node = panelRef.current;
    const reduced = prefersReducedMotion();
    if (!node || reduced) {
      setVisible(false);
      setMounted(false);
      closingRef.current = false;
      onClose();
      return;
    }
    gsap.to(node, {
      opacity: 0,
      scale: 0.92,
      y: -8,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        setVisible(false);
        setMounted(false);
        closingRef.current = false;
        onClose();
      }
    });
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    setRecent(readRecentEmojis());
    setActiveCategory('recent');
    setMounted(true);
    setVisible(true);
    closingRef.current = false;
    const active = /** @type {HTMLElement | null} */ (document.activeElement);
    if (active && typeof active.blur === 'function') active.blur();
    return undefined;
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted || !visible) return undefined;
    const node = panelRef.current;
    if (!node) return undefined;
    const reduced = prefersReducedMotion();
    if (reduced) {
      gsap.set(node, { opacity: 1, scale: 1, y: 0 });
      return undefined;
    }
    gsap.fromTo(
      node,
      { opacity: 0, scale: 0.88, y: -10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'power3.out' }
    );
    return undefined;
  }, [mounted, visible, mode, layout?.width, layout?.height]);

  useEffect(() => {
    if (!mounted || !visible) return undefined;
    return registerOverlay(`emoji-picker-${titleId}`, () => {
      animateClose();
    });
  }, [animateClose, mounted, titleId, visible]);

  useEffect(() => {
    if (!mounted || !visible) return undefined;
    const onPointerDown = (event) => {
      const target = /** @type {Node | null} */ (event.target);
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-emoji-trigger="true"]')) return;
      animateClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [animateClose, mounted, visible]);

  useEffect(() => {
    if (!open && mounted && visible && !closingRef.current) {
      animateClose();
    }
  }, [animateClose, mounted, open, visible]);

  const handlePick = (emoji) => {
    pushRecentEmoji(emoji);
    setRecent(readRecentEmojis());
    onPick(emoji);
  };

  if (!mounted || !layout || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className={clsx('emoji-picker', `emoji-picker--${mode}`, visible && 'is-visible')}
      style={{
        top: layout.top,
        left: layout.left,
        width: layout.width,
        height: layout.height,
        transformOrigin: layout.transformOrigin
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="visually-hidden">
        Выбор эмодзи
      </h2>
      <div className="emoji-picker__cats" role="tablist" aria-label="Категории эмодзи">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={clsx(
              'emoji-picker__cat',
              activeCategory === cat.id && 'is-active'
            )}
            onClick={() => setActiveCategory(cat.id)}
            title={cat.label}
          >
            <span aria-hidden="true">{cat.icon}</span>
            <span className="visually-hidden">{cat.label}</span>
          </button>
        ))}
      </div>
      <div className="emoji-picker__grid" role="tabpanel">
        {activeCategory === 'recent' && activeEmojis.length === 0 ? (
          <div className="emoji-picker__empty">
            <EmptyClockIcon />
            <p>Тут пока еще ничего нет</p>
          </div>
        ) : (
          activeEmojis.map((emoji) => (
            <button
              key={`${activeCategory}-${emoji}`}
              type="button"
              className="emoji-picker__emoji"
              onClick={() => handlePick(emoji)}
            >
              {emoji}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  );
}

export default EmojiPicker;
