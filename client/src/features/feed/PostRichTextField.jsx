import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import PostFormatToolbar from './PostFormatToolbar';
import {
  applyFormatCommand,
  getEditorHtml,
  isEditorEmpty,
  readActiveFormats
} from './postRichText';

/**
 * Тестовый rich-text: плавающий тулбар по фокусу + постоянный минимальный.
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
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState({ bold: false, italic: false, underline: false });
  const [empty, setEmpty] = useState(true);
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

  useEffect(() => {
    const el = editorRef.current;
    if (!el || skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const next = value || '';
    if (el.innerHTML !== next) {
      el.innerHTML = next;
      setEmpty(isEditorEmpty(el));
    }
  }, [value]);

  useEffect(() => {
    if (!focused) return undefined;
    const onSelectionChange = () => {
      const el = editorRef.current;
      if (!el) return;
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      if (!node || !el.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node)) return;
      refreshActive();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [focused, refreshActive]);

  const handleCommand = (command) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    if (command === 'link') {
      const url = window.prompt('Ссылка (https://…)', 'https://');
      if (url === null) return;
      applyFormatCommand('link', url);
    } else {
      applyFormatCommand(command);
    }

    skipNextSync.current = true;
    syncEmptyAndValue();
    refreshActive();
  };

  const handleBlur = () => {
    requestAnimationFrame(() => {
      const root = rootRef.current;
      const activeEl = document.activeElement;
      if (root && activeEl && root.contains(activeEl)) return;
      setFocused(false);
      syncEmptyAndValue();
    });
  };

  return (
    <div className="post-rich-text" ref={rootRef}>
      <PostFormatToolbar variant="permanent" active={active} onCommand={handleCommand} />

      <div className={`post-rich-text__editor-wrap${focused ? ' is-focused' : ''}`}>
        {focused ? (
          <div className="post-rich-text__floating-slot">
            <PostFormatToolbar variant="floating" active={active} onCommand={handleCommand} />
          </div>
        ) : null}

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
          onFocus={() => {
            setFocused(true);
            refreshActive();
          }}
          onBlur={handleBlur}
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
