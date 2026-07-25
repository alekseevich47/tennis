import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import PostFormatToolbar from './PostFormatToolbar';
import FrameColorPicker from './FrameColorPicker';
import {
  applyAnimFrame,
  applyFormatCommand,
  ensureFrameCarets,
  getEditorHtml,
  isEditorEmpty,
  normalizeHexColor,
  readActiveFormats
} from './postRichText';

/**
 * Тестовый rich-text: статичный тулбар + анимационная рамка.
 *
 * @param {{
 *   id?: string,
 *   value: string,
 *   onChange: (html: string) => void,
 *   placeholder?: string,
 *   'aria-label'?: string
 * }} props
 */
function PostRichTextField({
  id: idProp,
  value,
  onChange,
  placeholder = 'Что нового в секции?…',
  'aria-label': ariaLabel = 'Текст публикации'
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const editorRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const savedRangeRef = useRef(/** @type {Range | null} */ (null));
  const [active, setActive] = useState({ bold: false, italic: false, underline: false });
  const [empty, setEmpty] = useState(true);
  const [frameOpen, setFrameOpen] = useState(false);
  const [frameColor, setFrameColor] = useState('#FF4D6D');
  const skipNextSync = useRef(false);

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

  useEffect(() => {
    const el = editorRef.current;
    if (!el || skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const next = value || '';
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
      if (!sel || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      if (!node || !el.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node)) return;
      saveSelection();
      refreshActive();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [refreshActive, saveSelection]);

  useEffect(() => {
    if (!frameOpen) return undefined;
    const onPointerDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setFrameOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [frameOpen]);

  const handleCommand = (command) => {
    const el = editorRef.current;
    if (!el) return;

    if (command === 'frame') {
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
    skipNextSync.current = true;
    syncEmptyAndValue();
  };

  return (
    <div className="post-rich-text" ref={rootRef}>
      <div className="post-rich-text__toolbar-row">
        <PostFormatToolbar
          active={active}
          frameOpen={frameOpen}
          onCommand={handleCommand}
        />
        {frameOpen ? (
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
          aria-multiline="true"
          aria-label={ariaLabel}
          data-placeholder={placeholder}
          data-empty={empty ? 'true' : 'false'}
          suppressContentEditableWarning
          onFocus={refreshActive}
          onBlur={() => {
            requestAnimationFrame(() => {
              const root = rootRef.current;
              const activeEl = document.activeElement;
              if (root && activeEl && root.contains(activeEl)) return;
              syncEmptyAndValue();
            });
          }}
          onInput={() => {
            skipNextSync.current = true;
            syncEmptyAndValue();
            refreshActive();
          }}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
        />
      </div>
    </div>
  );
}

export default PostRichTextField;
