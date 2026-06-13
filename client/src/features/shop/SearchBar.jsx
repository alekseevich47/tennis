import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import './SearchBar.css';

const PLACEHOLDER_TEXT = 'я жду...';

/**
 * @param {{
 *   searchQuery: string,
 *   onSearchChange: (query: string) => void,
 *   isOpen: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   onSearchToggle?: (open: boolean) => void,
 *   onFocusChange?: (focused: boolean) => void,
 *   className?: string
 * }} props
 */
export default function SearchBar({
  searchQuery,
  onSearchChange,
  isOpen,
  onOpenChange,
  onSearchToggle,
  onFocusChange,
  className
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const prevQueryRef = useRef(searchQuery);
  const [clearAnim, setClearAnim] = useState('');

  const setOpen = useCallback(
    (open) => {
      onOpenChange(open);
      onSearchToggle?.(open);
    },
    [onOpenChange, onSearchToggle]
  );

  const closeSearchUI = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleOpen = useCallback(() => {
    if (!isOpen) setOpen(true);
  }, [isOpen, setOpen]);

  const handleClear = useCallback(
    (event) => {
      event.stopPropagation();
      onSearchChange('');
      inputRef.current?.focus();
    },
    [onSearchChange]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 750);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    inputRef.current?.blur();
    onFocusChange?.(false);
  }, [isOpen, onFocusChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      if (event.target instanceof Element && event.target.closest('.category-dropdown')) return;
      if (searchQuery.trim()) return;
      closeSearchUI();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !searchQuery.trim()) closeSearchUI();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, searchQuery, closeSearchUI]);

  useEffect(() => {
    const hadQuery = prevQueryRef.current.length > 0;
    const hasQuery = searchQuery.length > 0;

    if (!hadQuery && hasQuery) {
      setClearAnim('forming');
      const timer = window.setTimeout(() => setClearAnim('formed'), 350);
      prevQueryRef.current = searchQuery;
      return () => window.clearTimeout(timer);
    }

    if (hadQuery && !hasQuery) {
      setClearAnim('dissolving');
      const timer = window.setTimeout(() => setClearAnim(''), 350);
      prevQueryRef.current = searchQuery;
      return () => window.clearTimeout(timer);
    }

    prevQueryRef.current = searchQuery;
    return undefined;
  }, [searchQuery]);

  const showClear = isOpen && (searchQuery.length > 0 || clearAnim === 'dissolving');
  const showPlaceholder = isOpen && searchQuery.length === 0;

  return (
    <div
      ref={rootRef}
      className={clsx('search', isOpen && 'open', className)}
      onClick={handleOpen}
      role="search"
      aria-expanded={isOpen}
    >
      <svg
        className="search-icon"
        x="0px"
        y="0px"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <g strokeLinecap="square" strokeLinejoin="miter" stroke="currentColor">
          <line fill="none" strokeMiterlimit="10" x1="22" y1="22" x2="16.4" y2="16.4" />
          <circle fill="none" stroke="currentColor" strokeMiterlimit="10" cx="10" cy="10" r="9" />
        </g>
      </svg>

      <div className="search-field">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          aria-label="Поиск по названию или #артикулу"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {showPlaceholder && (
          <div className="search-placeholder" aria-hidden="true">
            {PLACEHOLDER_TEXT}
          </div>
        )}

        {showClear && (
          <button
            type="button"
            className={clsx(
              'search-clear',
              clearAnim === 'forming' && 'forming',
              clearAnim === 'formed' && 'formed',
              clearAnim === 'dissolving' && 'dissolving'
            )}
            onClick={handleClear}
            aria-label="Очистить поиск"
          >
            <span />
            <span />
          </button>
        )}
      </div>
    </div>
  );
}
