import React, { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import IconButton from './IconButton';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import './Modal.css';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Универсальная модалка с focus-trap, ESC handler, scroll-lock и aria-разметкой.
 * Решает M1, M8 для всех экранов.
 *
 * Props:
 * - `isOpen` (bool)
 * - `onClose` (fn)
 * - `title` (string | node) — отображается в `<h2 id={titleId}>`
 * - `ariaLabel` (string) — альтернатива title при отсутствии заголовка
 * - `children`
 * - `className` (string) — доп.класс для `.modal-content`
 * - `overlayClassName` (string) — доп.класс для `.ui-modal-overlay`
 * - `closeOnOverlay` (bool, default true)
 * - `showCloseButton` (bool, default true)
 * - `headerActions` (node) — кнопки слева от крестика закрытия
 * - `footer` (node) — sticky-блок под скроллом
 * - `size` ('default' | 'large' | 'tall')
 */
function Modal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  children,
  className,
  overlayClassName,
  closeOnOverlay = true,
  showCloseButton = true,
  headerActions,
  footer,
  size = 'default'
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousActiveRef = useRef(null);

  useOverlayClose(Boolean(isOpen), onClose);

  // ESC handler.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Scroll lock + перевод фокуса (используем layout-effect чтобы не было «вспышки» прокрутки).
  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    previousActiveRef.current = document.activeElement;

    requestAnimationFrame(() => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = node.querySelector(FOCUSABLE_SELECTORS);
      if (focusable) focusable.focus();
      else node.focus();
    });

    return () => {
      body.style.overflow = previousOverflow;
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [isOpen]);

  // Focus trap (Tab / Shift+Tab).
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab') return;
    const node = dialogRef.current;
    if (!node) return;
    const focusables = Array.from(node.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
    );
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !node.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={clsx('ui-modal-overlay', overlayClassName)}
      onClick={closeOnOverlay ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={clsx('ui-modal-content', `ui-modal-${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {(headerActions || showCloseButton) && (
          <div className="ui-modal-header-actions">
            {headerActions}
            {showCloseButton ? (
              <IconButton
                type="button"
                className="ui-modal-close"
                ariaLabel="Закрыть"
                onClick={onClose}
              >
                <span aria-hidden="true">✕</span>
              </IconButton>
            ) : null}
          </div>
        )}

        {title && (
          <h2
            className={clsx('ui-modal-title', headerActions && 'ui-modal-title--with-actions')}
            id={titleId}
          >
            {title}
          </h2>
        )}

        <div className="ui-modal-body">{children}</div>

        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
