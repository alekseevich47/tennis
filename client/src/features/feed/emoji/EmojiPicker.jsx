import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import clsx from 'clsx';
import { EMOJI_CATEGORIES, DEFAULT_FREQUENT_EMOJIS } from './emojiData';
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

function SearchIcon() {
  return (
    <svg className="emoji-picker__search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.2 16.2 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BackspaceIcon() {
  return (
    <svg className="emoji-picker__backspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.2 6.5h10.3A2.2 2.2 0 0 1 20.7 8.7v6.6a2.2 2.2 0 0 1-2.2 2.2H8.2L4 12l4.2-5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M11.2 10.2 14.8 13.8M14.8 10.2 11.2 13.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** @type {Record<string, (props?: { className?: string }) => JSX.Element>} */
const CATEGORY_ICONS = {
  recent: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.2v4.3l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  smileys: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9.2" cy="10.2" r="1" fill="currentColor" />
      <circle cx="14.8" cy="10.2" r="1" fill="currentColor" />
      <path d="M8.8 14c1 1.2 2 1.8 3.2 1.8s2.2-.6 3.2-1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  gestures: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.5 11.5V8.8a1.3 1.3 0 0 1 2.6 0V11M11.1 11V7.6a1.3 1.3 0 0 1 2.6 0V11M13.7 10.8V8.2a1.3 1.3 0 0 1 2.6 0v5.2c0 2.4-1.7 4.4-4.1 4.4h-.4c-1.8 0-3.3-1-4.1-2.5L6.5 12.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  people: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.2 18.2c.8-2.8 2.8-4.2 5.8-4.2s5 1.4 5.8 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  animals: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.2 10.2c-1.4-.8-2.2-2-2-3.2.8 0 1.8.6 2.6 1.5M16.8 10.2c1.4-.8 2.2-2 2-3.2-.8 0-1.8.6-2.6 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="13" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="10.2" cy="12.4" r="0.9" fill="currentColor" />
      <circle cx="13.8" cy="12.4" r="0.9" fill="currentColor" />
      <path d="M11.2 14.6h1.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  food: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.5 14.5c0-3.2 2-5.8 4.5-5.8s4.5 2.6 4.5 5.8v1.2H7.5v-1.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 8.6c.8-.8 1.7-1.2 3-1.2s2.2.4 3 1.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.2 17.8h7.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  activities: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4v16M4.8 8.8h14.4M4.8 15.2h14.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.2 5.8c2 2.2 2.8 4.6 2.8 6.2s-.8 4-2.8 6.2M16.8 5.8c-2 2.2-2.8 4.6-2.8 6.2s.8 4 2.8 6.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  travel: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 15.5h11.2l2.8-3.2H9.8L8.2 9.5H6.4l1.4 2.8H4.5v3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="17.2" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.2" cy="17.2" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  objects: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5v7.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M9.2 11.7h5.6l.8 7.3H8.4l.8-7.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="7.2" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  symbols: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 18.2s-5.8-3.6-5.8-7.2A3.2 3.2 0 0 1 12 8.4a3.2 3.2 0 0 1 5.8 2.6c0 3.6-5.8 7.2-5.8 7.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  flags: ({ className } = {}) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 4.8v14.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M6.5 5.4h9.2l-1.4 3.2 1.4 3.2H6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
};

/**
 * @param {{
 *   open: boolean,
 *   mode?: 'comment' | 'post' | 'field' | 'toolbar',
 *   top?: number | null,
 *   bottom?: number | null,
 *   left?: number | null,
 *   width?: number | null,
 *   height?: number | null,
 *   onClose: () => void,
 *   onPick: (emoji: string) => void,
 *   onBackspace?: () => void,
 *   shouldIgnoreClose?: (target: EventTarget | null) => boolean
 * }} props
 */
function EmojiPicker({
  open,
  mode = 'comment',
  top = null,
  bottom = null,
  left = null,
  width = null,
  height = null,
  onClose,
  onPick,
  onBackspace,
  shouldIgnoreClose
}) {
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const searchRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [recent, setRecent] = useState(() => readRecentEmojis());
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [query, setQuery] = useState('');
  const titleId = useId();
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const shouldIgnoreRef = useRef(shouldIgnoreClose);
  shouldIgnoreRef.current = shouldIgnoreClose;

  const frequent = useMemo(
    () => (recent.length > 0 ? recent.slice(0, 24) : DEFAULT_FREQUENT_EMOJIS),
    [recent]
  );

  const categories = useMemo(
    () => [{ id: 'recent', label: 'Часто используемые', emojis: frequent }, ...EMOJI_CATEGORIES],
    [frequent]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    /** @type {string[]} */
    const out = [];
    const seen = new Set();
    for (const cat of categories) {
      const labelHit = cat.label.toLowerCase().includes(q);
      for (const emoji of cat.emojis) {
        if (seen.has(emoji)) continue;
        if (labelHit || emoji.includes(q) || q.includes(emoji)) {
          seen.add(emoji);
          out.push(emoji);
        }
      }
    }
    return out;
  }, [categories, query]);

  const activeCategoryMeta = useMemo(
    () => categories.find((c) => c.id === activeCategory) || categories[0],
    [activeCategory, categories]
  );

  const layout = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640;

    if (top != null && Number.isFinite(top) && height != null && Number.isFinite(height)) {
      const resolvedWidth = width ?? Math.max(200, vw - 16);
      const resolvedLeft = left != null ? left : 8;
      return {
        top: Math.max(8, Math.round(top)),
        left: Math.max(8, Math.round(resolvedLeft)),
        width: resolvedWidth,
        height: Math.max(140, Math.round(height)),
        transformOrigin: mode === 'post' ? '50% 0%' : '50% 100%'
      };
    }

    if (bottom == null || !Number.isFinite(bottom)) return null;

    if (mode === 'comment' || mode === 'field') {
      const size = height ?? Math.min(280, Math.max(220, Math.round(vw * 0.72)));
      const resolvedWidth = width ?? size;
      const resolvedLeft = left != null ? left : Math.max(8, vw - resolvedWidth - 8);
      const resolvedTop = Math.max(8, Math.round(bottom - size));
      return {
        top: resolvedTop,
        left: Math.max(8, Math.round(resolvedLeft)),
        width: resolvedWidth,
        height: Math.min(size, Math.max(120, bottom - 8)),
        transformOrigin: '50% 100%'
      };
    }

    const resolvedWidth = width ?? Math.max(200, vw - 16);
    const resolvedHeight = height ?? Math.max(180, Math.round(vh / 3));
    const resolvedLeft = left != null ? left : 8;
    const resolvedTop = Math.max(8, Math.round(bottom - resolvedHeight));
    return {
      top: resolvedTop,
      left: Math.max(8, Math.round(resolvedLeft)),
      width: resolvedWidth,
      height: Math.min(resolvedHeight, Math.max(120, bottom - 8)),
      transformOrigin: mode === 'post' ? '50% 0%' : '50% 100%'
    };
  }, [bottom, height, left, mode, top, width]);

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
      scale: 0.96,
      y: mode === 'post' ? 8 : 10,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setVisible(false);
        setMounted(false);
        closingRef.current = false;
        onCloseRef.current();
      }
    });
  }, [mode]);

  useEffect(() => {
    if (!open) return undefined;
    setRecent(readRecentEmojis());
    setActiveCategory('smileys');
    setQuery('');
    setMounted(true);
    setVisible(true);
    closingRef.current = false;
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
      { opacity: 0, scale: 0.96, y: mode === 'post' ? -8 : 12 },
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

  const showSearchResults = searchResults != null;
  const showFrequentBlock =
    !showSearchResults && activeCategory !== 'recent' && frequent.length > 0;

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

      <div className="emoji-picker__search">
        <SearchIcon />
        <input
          ref={searchRef}
          type="search"
          className="emoji-picker__search-input"
          placeholder="Поиск эмодзи"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
          autoComplete="off"
        />
      </div>

      <div className="emoji-picker__cats" role="tablist" aria-label="Категории эмодзи">
        <div className="emoji-picker__cats-scroll">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const active = !showSearchResults && activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={clsx('emoji-picker__cat', active && 'is-active')}
                onClick={() => {
                  setQuery('');
                  setActiveCategory(cat.id);
                }}
                title={cat.label}
              >
                {Icon ? <Icon className="emoji-picker__cat-icon" /> : <span aria-hidden="true">{cat.icon}</span>}
                <span className="visually-hidden">{cat.label}</span>
              </button>
            );
          })}
        </div>
        {onBackspace ? (
          <button
            type="button"
            className="emoji-picker__backspace"
            aria-label="Удалить символ"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onBackspace()}
          >
            <BackspaceIcon />
          </button>
        ) : null}
      </div>

      <div className="emoji-picker__body" role="tabpanel">
        {showSearchResults ? (
          searchResults.length === 0 ? (
            <div className="emoji-picker__empty">
              <EmptyClockIcon />
              <p>Ничего не найдено</p>
            </div>
          ) : (
            <section className="emoji-picker__section">
              <h3 className="emoji-picker__section-title">Результаты</h3>
              <div className="emoji-picker__grid">
                {searchResults.map((emoji) => (
                  <button
                    key={`search-${emoji}`}
                    type="button"
                    className="emoji-picker__emoji"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </section>
          )
        ) : activeCategory === 'recent' && frequent.length === 0 ? (
          <div className="emoji-picker__empty">
            <EmptyClockIcon />
            <p>Тут пока еще ничего нет</p>
          </div>
        ) : (
          <>
            {showFrequentBlock || activeCategory === 'recent' ? (
              <section className="emoji-picker__section">
                <h3 className="emoji-picker__section-title">Часто используемые</h3>
                <div className="emoji-picker__grid">
                  {frequent.map((emoji) => (
                    <button
                      key={`freq-${emoji}`}
                      type="button"
                      className="emoji-picker__emoji"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {activeCategory !== 'recent' ? (
              <section className="emoji-picker__section">
                <h3 className="emoji-picker__section-title">{activeCategoryMeta.label}</h3>
                <div className="emoji-picker__grid">
                  {activeCategoryMeta.emojis.map((emoji) => (
                    <button
                      key={`${activeCategory}-${emoji}`}
                      type="button"
                      className="emoji-picker__emoji"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default EmojiPicker;
