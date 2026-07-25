import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { clamp } from '../../lib/gestures';
import './Feed.css';

const MENU_VIEWPORT_PAD = 8;
const MENU_WIDTH = 200;

/**
 * Контекстное меню действий поста (long-press / кнопка «⋯», только модератор).
 *
 * @param {{
 *   isOpen: boolean,
 *   anchorPoint?: { x: number, y: number } | null,
 *   anchorRect?: { left: number, top: number, right?: number, bottom?: number, width?: number, height?: number } | null,
 *   origin?: 'start' | 'end',
 *   isPinned?: boolean,
 *   onTogglePin?: () => void,
 *   onEdit?: () => void,
 *   onDelete?: () => void,
 *   onClose: () => void
 * }} props
 */
export default function PostContextMenu({
  isOpen,
  anchorPoint = null,
  anchorRect = null,
  origin = 'start',
  isPinned = false,
  onTogglePin,
  onEdit,
  onDelete,
  onClose
}) {
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

    let rawLeft;
    let rawTop;

    if (anchorPoint) {
      rawLeft = anchorPoint.x;
      rawTop = anchorPoint.y;
    } else if (anchorRect) {
      const right = anchorRect.right ?? (anchorRect.left + (anchorRect.width || 0));
      rawLeft = origin === 'end' ? right - menuWidth : anchorRect.left;
      rawTop = (anchorRect.bottom ?? (anchorRect.top + (anchorRect.height || 0))) + 4;
    } else {
      rawLeft = MENU_VIEWPORT_PAD;
      rawTop = MENU_VIEWPORT_PAD;
    }

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
  }, [isOpen, mounted, anchorPoint, anchorRect, origin]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const runAndClose = useCallback((action) => {
    action?.();
    onClose();
  }, [onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className={clsx('post-context-menu-backdrop', isVisible && 'post-context-menu-backdrop--visible')}
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        className={clsx(
          'post-context-menu',
          origin === 'end' && 'post-context-menu--from-end',
          isVisible && 'post-context-menu--visible'
        )}
        role="menu"
        aria-label="Действия с публикацией"
        aria-hidden={!isOpen}
        onTransitionEnd={handleTransitionEnd}
      >
        <button
          type="button"
          role="menuitem"
          className="post-context-menu__item"
          onClick={() => runAndClose(onTogglePin)}
        >
          {isPinned ? 'Открепить' : 'Закрепить'}
        </button>
        <button
          type="button"
          role="menuitem"
          className="post-context-menu__item"
          onClick={() => runAndClose(onEdit)}
        >
          Редактировать
        </button>
        <button
          type="button"
          role="menuitem"
          className="post-context-menu__item post-context-menu__item--danger"
          onClick={() => runAndClose(onDelete)}
        >
          Удалить
        </button>
      </div>
    </>,
    document.body
  );
}
