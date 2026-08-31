import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import IconButton from './IconButton';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import {
  ensureModalOriginTracking,
  getLastPointerOrigin,
  getModalCollapseTransform,
  MODAL_CLOSE_MS,
  snapshotOriginRect
} from '../../lib/modalOrigin';
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

export { MODAL_CLOSE_MS };

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
 * - `originRect` ({ left, top, width, height } | null) — точка появления/схлапывания;
 *   иначе last pointer / activeElement (до focus-trap)
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
  size = 'default',
  originRect = null,
  bodyRef = null
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousActiveRef = useRef(null);
  const originRef = useRef(/** @type {import('../../lib/modalOrigin').OriginRect | null} */ (null));
  const closeTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const wasOpenRef = useRef(false);
  /** Overlay close only if pointerdown+up both on overlay (not text-select drag). */
  const overlayPointerDownRef = useRef(false);
  const [mounted, setMounted] = useState(Boolean(isOpen));
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    ensureModalOriginTracking();
  }, []);

  // Mount / exit-анимация. Origin снимаем в layout до focus-trap.
  useLayoutEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (!wasOpenRef.current) {
        originRef.current =
          originRect ||
          getLastPointerOrigin() ||
          snapshotOriginRect(/** @type {Element | null} */ (document.activeElement));
      }
      wasOpenRef.current = true;
      setMounted(true);
      setClosing(false);
      return undefined;
    }

    wasOpenRef.current = false;
    if (!mounted) return undefined;

    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setMounted(false);
      setClosing(false);
      originRef.current = null;
      if (dialogRef.current) {
        dialogRef.current.style.transform = '';
        dialogRef.current.style.opacity = '';
      }
    }, MODAL_CLOSE_MS);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen, mounted, originRect]);

  useOverlayClose(Boolean(isOpen), onClose);

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

  useLayoutEffect(() => {
    if (!isOpen || closing) return undefined;
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
  }, [isOpen, closing]);

  useLayoutEffect(() => {
    if (!closing) return undefined;
    const node = dialogRef.current;
    if (!node) return undefined;

    const origin = originRect || originRef.current;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduced) {
      node.style.opacity = '0';
      return undefined;
    }

    void node.offsetWidth;
    const frame = requestAnimationFrame(() => {
      node.style.transform = getModalCollapseTransform(node, origin);
      node.style.opacity = '0';
    });
    return () => cancelAnimationFrame(frame);
  }, [closing, originRect]);

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

  const handleOverlayPointerDown = useCallback((e) => {
    overlayPointerDownRef.current = e.target === e.currentTarget;
  }, []);

  const handleOverlayClick = useCallback(
    (e) => {
      if (closing || !closeOnOverlay || !onClose) return;
      if (e.target !== e.currentTarget) return;
      if (!overlayPointerDownRef.current) return;
      overlayPointerDownRef.current = false;
      onClose();
    },
    [closing, closeOnOverlay, onClose]
  );

  if (!mounted) return null;

  return (
    <div
      className={clsx(
        'ui-modal-overlay',
        closing && 'ui-modal-overlay--closing',
        overlayClassName
      )}
      onPointerDown={handleOverlayPointerDown}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={clsx(
          'ui-modal-content',
          `ui-modal-${size}`,
          closing && 'ui-modal-content--closing',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        onPointerDown={() => {
          overlayPointerDownRef.current = false;
        }}
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
                disabled={closing}
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

        <div className="ui-modal-body" ref={bodyRef}>{children}</div>

        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
