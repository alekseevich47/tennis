import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import PostFormatToolbar from './PostFormatToolbar';
import FrameColorPicker from './FrameColorPicker';
import {
  FRAME_CLASS,
  applyAnimFrame,
  applyFormatCommand,
  ensureFrameCarets,
  getEditorHtml,
  isEditorEmpty,
  normalizeHexColor,
  readActiveFormats
} from './postRichText';

/**
 * Rich-text поле: статичный тулбар + всплывающий при выделении + опциональная анимационная рамка.
 *
 * @param {{
 *   id?: string,
 *   value: string,
 *   onChange: (html: string) => void,
 *   placeholder?: string,
 *   'aria-label'?: string,
 *   enableFrame?: boolean,
 *   compact?: boolean,
 *   revealToolbarOnFocus?: boolean,
 *   singleLine?: boolean
 * }} props
 */
function PostRichTextField({
  id: idProp,
  value,
  onChange,
  placeholder = 'Что нового в секции?…',
  'aria-label': ariaLabel = 'Текст публикации',
  enableFrame = true,
  compact = false,
  revealToolbarOnFocus = false,
  singleLine = false
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const editorRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const floatingRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const savedRangeRef = useRef(/** @type {Range | null} */ (null));
  const [active, setActive] = useState({ bold: false, italic: false, underline: false });
  const [empty, setEmpty] = useState(true);
  const [focused, setFocused] = useState(false);
  const [frameOpen, setFrameOpen] = useState(false);
  const [frameColor, setFrameColor] = useState('#FF4D6D');
  const [selectionToolbar, setSelectionToolbar] = useState(
    /** @type {{ top: number, left: number } | null} */ (null)
  );
  const skipNextSync = useRef(false);
  const showTopToolbar = !revealToolbarOnFocus || focused || frameOpen;

  const syncEmptyAndValue = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setEmpty(isEditorEmpty(el));
    onChange(getEditorHtml(el));
  }, [onChange]);

  const refreshActive = useCallback(() => {
    setActive(readActiveFormats());
  }, []);

  const saveSelection = useCallback(() => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!el || !range || !selection) return;
    el.focus();
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const updateSelectionToolbar = useCallback(() => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionToolbar(null);
      return;
    }
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (!anchor || !focus || !el.contains(anchor) || !el.contains(focus)) {
      setSelectionToolbar(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setSelectionToolbar(null);
      return;
    }

    const toolbarWidth = floatingRef.current?.offsetWidth || 148;
    const gap = 20;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2),
      window.innerWidth - toolbarWidth - 8
    );
    let top = rect.bottom + gap;
    if (top + 44 > window.innerHeight - 8) {
      top = Math.max(8, rect.top - 44 - gap);
    }

    setSelectionToolbar((prev) => {
      if (prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) {
        return prev;
      }
      return { top, left };
    });
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || '';
    // skipNextSync — не перетирать DOM сразу после onInput/команды форматирования.
    // Но если value пришёл снаружи (очистка после отправки комментария) и DOM не совпадает —
    // всё равно синхронизировать: иначе на мобильных текст остаётся в поле при value=''.
    if (skipNextSync.current) {
      skipNextSync.current = false;
      if (getEditorHtml(el) === next || el.innerHTML === next) return;
    }
    if (el.innerHTML !== next) {
      el.innerHTML = next;
      ensureFrameCarets(el);
      setEmpty(isEditorEmpty(el));
    }
  }, [value]);

  useEffect(() => {
    const onSelectionChange = () => {
      const el = editorRef.current;
      if (!el) return;
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setSelectionToolbar(null);
        return;
      }
      const node = sel.anchorNode;
      if (!node || !el.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node)) {
        setSelectionToolbar(null);
        return;
      }
      saveSelection();
      refreshActive();
      updateSelectionToolbar();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [refreshActive, saveSelection, updateSelectionToolbar]);

  const selectionToolbarVisible = Boolean(selectionToolbar);
  useLayoutEffect(() => {
    if (!selectionToolbarVisible) return undefined;
    const onReposition = () => updateSelectionToolbar();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [selectionToolbarVisible, updateSelectionToolbar]);

  useEffect(() => {
    if (!frameOpen) return undefined;
    const onPointerDown = (e) => {
      const root = rootRef.current;
      const floating = floatingRef.current;
      if (e.target instanceof Node) {
        if (root?.contains(e.target) || floating?.contains(e.target)) return;
      }
      setFrameOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [frameOpen]);

  const handleCommand = (command) => {
    const el = editorRef.current;
    if (!el) return;

    if (command === 'frame') {
      if (!enableFrame) return;
      saveSelection();
      setFrameOpen((open) => !open);
      return;
    }

    setFrameOpen(false);
    restoreSelection();
    el.focus();
    applyFormatCommand(/** @type {'bold' | 'italic' | 'underline'} */ (command));

    skipNextSync.current = true;
    syncEmptyAndValue();
    refreshActive();
    requestAnimationFrame(updateSelectionToolbar);
  };

  const handleApplyFrame = (hex) => {
    const el = editorRef.current;
    if (!el) return;
    const color = normalizeHexColor(hex) || frameColor;
    restoreSelection();
    applyAnimFrame(color, el);
    ensureFrameCarets(el);
    setFrameColor(color);
    setFrameOpen(false);
    setSelectionToolbar(null);
    skipNextSync.current = true;
    syncEmptyAndValue();
  };

  /** Клик справа от рамки → каретка вне чипа (без spacer-символа). */
  const handleEditorMouseDown = (event) => {
    const el = editorRef.current;
    if (!el || !(event.target instanceof Element)) return;

    // Редактирование вариантов внутри рамки — не перехватываем.
    if (event.target.closest(`.${FRAME_CLASS} .post-anim-frame__text`)) return;

    const frames = Array.from(el.querySelectorAll(`.${FRAME_CLASS}`));
    if (frames.length === 0) return;

    /** @type {HTMLElement | null} */
    let afterFrame = null;
    const clickedFrame = event.target.closest(`.${FRAME_CLASS}`);

    if (clickedFrame && el.contains(clickedFrame)) {
      const rect = clickedFrame.getBoundingClientRect();
      // Правая четверть чипа / клик правее — каретка после рамки.
      if (event.clientX >= rect.left + rect.width * 0.65) {
        afterFrame = /** @type {HTMLElement} */ (clickedFrame);
      }
    } else if (event.target === el) {
      const last = /** @type {HTMLElement} */ (frames[frames.length - 1]);
      const rect = last.getBoundingClientRect();
      if (event.clientX >= rect.right - 4) {
        afterFrame = last;
      }
    }

    if (!afterFrame) return;

    event.preventDefault();
    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStartAfter(afterFrame);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
    setSelectionToolbar(null);
  };

  const floatingToolbar =
    selectionToolbar && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={floatingRef}
            className="post-format-toolbar-floating"
            style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <PostFormatToolbar
              active={active}
              frameOpen={frameOpen}
              enableFrame={enableFrame}
              onCommand={handleCommand}
            />
            {enableFrame && frameOpen ? (
              <FrameColorPicker
                color={frameColor}
                onChange={setFrameColor}
                onApply={handleApplyFrame}
                onClose={() => setFrameOpen(false)}
              />
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={clsx(
        'post-rich-text',
        compact && 'post-rich-text--compact',
        singleLine && 'post-rich-text--single-line',
        revealToolbarOnFocus && 'post-rich-text--reveal-toolbar'
      )}
      ref={rootRef}
    >
      <div
        className={clsx(
          'post-rich-text__toolbar-row',
          revealToolbarOnFocus && 'post-rich-text__toolbar-row--reveal',
          showTopToolbar && 'is-visible'
        )}
        aria-hidden={revealToolbarOnFocus && !showTopToolbar ? true : undefined}
      >
        <PostFormatToolbar
          active={active}
          frameOpen={frameOpen}
          enableFrame={enableFrame}
          onCommand={handleCommand}
        />
        {enableFrame && frameOpen && !selectionToolbar ? (
          <FrameColorPicker
            color={frameColor}
            onChange={setFrameColor}
            onApply={handleApplyFrame}
            onClose={() => setFrameOpen(false)}
          />
        ) : null}
      </div>

      <div className="post-rich-text__editor-wrap">
        <div
          id={id}
          ref={editorRef}
          className="post-rich-text__editor"
          contentEditable
          role="textbox"
          aria-multiline={!singleLine}
          aria-label={ariaLabel}
          data-placeholder={placeholder}
          data-empty={empty ? 'true' : 'false'}
          suppressContentEditableWarning
          onFocus={() => {
            setFocused(true);
            refreshActive();
          }}
          onMouseDown={handleEditorMouseDown}
          onKeyDown={(event) => {
            if (singleLine && event.key === 'Enter') {
              event.preventDefault();
            }
          }}
          onBlur={() => {
            requestAnimationFrame(() => {
              const root = rootRef.current;
              const floating = floatingRef.current;
              const activeEl = document.activeElement;
              if (root && activeEl && root.contains(activeEl)) return;
              if (floating && activeEl && floating.contains(activeEl)) return;
              syncEmptyAndValue();
              setSelectionToolbar(null);
              setFrameOpen(false);
              setFocused(false);
            });
          }}
          onInput={() => {
            skipNextSync.current = true;
            syncEmptyAndValue();
            refreshActive();
            updateSelectionToolbar();
          }}
          onKeyUp={refreshActive}
          onMouseUp={() => {
            refreshActive();
            updateSelectionToolbar();
          }}
        />
      </div>

      {floatingToolbar}
    </div>
  );
}

export default PostRichTextField;
