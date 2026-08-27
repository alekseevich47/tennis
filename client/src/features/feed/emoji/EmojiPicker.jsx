import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import clsx from 'clsx';
import { EMOJI_CATEGORIES } from './emojiData';
import { pushRecentEmoji, readRecentEmojis } from './emojiRecent';
import { registerOverlay } from '../../../lib/overlayStack';
import './EmojiPicker.css';

/** Длительность fade скрепки/камеры и smile в комментариях. */
export const EMOJI_ATTACH_SWAP_MS = 280;

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
 *   bottom: number | null,
 *   left?: number | null,
 *   width?: number | null,
 *   height?: number | null,
 *   onClose: () => void,
 *   onPick: (emoji: string) => void,
 *   shouldIgnoreClose?: (target: EventTarget | null) => boolean
 * }} props
 */
function EmojiPicker({
  open,
  mode,
  bottom,
  left = null,
  width = null,
  height = null,
  onClose,
  onPick,
  shouldIgnoreClose
}) {
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [recent, setRecent] = useState(() => readRecentEmojis());
  const [activeCategory, setActiveCategory] = useState('recent');
  const titleId = useId();
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const shouldIgnoreRef = useRef(shouldIgnoreClose);
  shouldIgnoreRef.current = shouldIgnoreClose;

  const categories = useMemo(
    () => [{ id: 'recent', label: 'Недавние', icon: '🕒', emojis: recent }, ...EMOJI_CATEGORIES],
    [recent]
  );

  const activeEmojis = useMemo(() => {
    const found = categories.find((c) => c.id === activeCategory);
    return found?.emojis || [];
  }, [activeCategory, categories]);

  const layout = useMemo(() => {
    if (bottom == null || !Number.isFinite(bottom)) return null;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640;

    if (mode === 'field') {
      const size = Math.min(280, Math.max(220, Math.round(vw * 0.72)));
      const resolvedWidth = width ?? size;
      const resolvedHeight = height ?? size;
      const resolvedLeft =
        left != null ? left : Math.max(8, vw - resolvedWidth - 8);
      const top = Math.max(8, Math.round(bottom - resolvedHeight));
      return {
        top,
        left: Math.max(8, Math.round(resolvedLeft)),
        width: resolvedWidth,
        height: Math.min(resolvedHeight, Math.max(120, bottom - 8)),
        transformOrigin: '100% 100%'
      };
    }

    const resolvedWidth = width ?? Math.max(200, vw - 16);
    const resolvedHeight = height ?? Math.max(180, Math.round(vh / 3));
    const resolvedLeft = left != null ? left : 8;
    const top = Math.max(8, Math.round(bottom - resolvedHeight));
    return {
      top,
      left: Math.max(8, Math.round(resolvedLeft)),
      width: resolvedWidth,
      height: Math.min(resolvedHeight, Math.max(120, bottom - 8)),
      transformOrigin: '50% 100%'
    };
  }, [bottom, height, left, mode, width]);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const node = panelRef.current;
    const reduced = prefersReducedMotion();
    if (!node || reduced) {
      setVisible(false);
      setMounted(false);
      closingRef.current = false;
      onCloseRef.current();
      return;
    }
    gsap.to(node, {
      opacity: 0,
      scale: 0.92,
      y: 10,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        setVisible(false);
        setMounted(false);
        closingRef.current = false;
        onCloseRef.current();
      }
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setRecent(readRecentEmojis());
    setActiveCategory('recent');
    setMounted(true);
    setVisible(true);
    closingRef.current = false;
    // Клавиатуру не закрываем — без blur.
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
      { opacity: 0, scale: 0.88, y: 12 },
      { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'power3.out' }
    );
    return undefined;
  }, [mounted, visible, mode, layout?.width, layout?.height, layout?.top]);

  useEffect(() => {
    if (!mounted || !visible) return undefined;
    return registerOverlay(`emoji-picker-${titleId}`, () => {
      animateClose();
    });
  }, [animateClose, mounted, titleId, visible]);

  useEffect(() => {
    if (!mounted || !visible) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (panelRef.current && target instanceof Node && panelRef.current.contains(target)) {
        return;
      }
      if (shouldIgnoreRef.current?.(target)) return;
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
