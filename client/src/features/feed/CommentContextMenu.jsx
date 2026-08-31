import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { clamp } from '../../lib/gestures';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import './Feed.css';

const MENU_VIEWPORT_PAD = 8;
const MENU_WIDTH = 200;

function EditIcon() {
  return (
    <svg
      className="post-context-menu__icon post-context-menu__icon--fill"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      className="post-context-menu__icon post-context-menu__icon--outline"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

/**
 * Контекстное меню комментария (long-press, модератор).
 * Edit — только свой; на чужом — только Удалить.
 *
 * @param {{
 *   isOpen: boolean,
 *   anchorPoint?: { x: number, y: number } | null,
 *   canEdit?: boolean,
 *   canDelete?: boolean,
 *   onEdit?: () => void,
 *   onDelete?: () => void,
 *   onClose: () => void
 * }} props
 */
export default function CommentContextMenu({
  isOpen,
  anchorPoint = null,
  canEdit = false,
  canDelete = true,
  onEdit,
  onDelete,
  onClose
}) {
  useOverlayClose(Boolean(isOpen), onClose, 'comment-context-menu');
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    return undefined;
  }, [isOpen]);

  const handleTransitionEnd = useCallback((event) => {
    if (event.target !== menuRef.current) return;
    if (event.propertyName !== 'opacity') return;
    if (isOpen) return;
    setMounted(false);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !mounted) return;

    const menu = menuRef.current;
    if (!menu) return;

    const menuWidth = menu.offsetWidth || MENU_WIDTH;
    const menuHeight = menu.offsetHeight || 0;

    const rawLeft = anchorPoint?.x ?? MENU_VIEWPORT_PAD;
    const rawTop = anchorPoint?.y ?? MENU_VIEWPORT_PAD;

    const left = clamp(
      rawLeft,
      MENU_VIEWPORT_PAD,
      Math.max(MENU_VIEWPORT_PAD, window.innerWidth - menuWidth - MENU_VIEWPORT_PAD)
    );
    const top = clamp(
      rawTop,
      MENU_VIEWPORT_PAD,
      Math.max(MENU_VIEWPORT_PAD, window.innerHeight - menuHeight - MENU_VIEWPORT_PAD)
    );

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }, [isOpen, mounted, anchorPoint]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      event.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  const runAndClose = useCallback((action) => {
    action?.();
    onClose();
  }, [onClose]);

  const handleBackdropPointer = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }, [onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className={clsx('post-context-menu-backdrop', isVisible && 'post-context-menu-backdrop--visible')}
        aria-hidden="true"
        onPointerDown={handleBackdropPointer}
        onClick={(event) => event.preventDefault()}
      />
      <div
        ref={menuRef}
        className={clsx('post-context-menu', isVisible && 'post-context-menu--visible')}
        role="menu"
        aria-label="Действия с комментарием"
        aria-hidden={!isOpen}
        onTransitionEnd={handleTransitionEnd}
      >
        {canEdit ? (
          <button
            type="button"
            role="menuitem"
            className="post-context-menu__item"
            onClick={() => runAndClose(onEdit)}
          >
            <EditIcon />
            Редактировать
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            role="menuitem"
            className="post-context-menu__item post-context-menu__item--danger"
            onClick={() => runAndClose(onDelete)}
          >
            <DeleteIcon />
            Удалить
          </button>
        ) : null}
      </div>
    </>,
    document.body
  );
}
