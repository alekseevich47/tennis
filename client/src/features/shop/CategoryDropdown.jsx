import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useProductCategories } from '../../hooks/useProductCategories';
import './CategoryDropdown.css';

const PLACEHOLDER = 'Все категории';

/**
 * @param {{
 *   selectedCategoryId: string,
 *   onCategoryChange: (categoryId: string) => void,
 *   isSearchOpen?: boolean,
 *   onCloseSearch?: () => void,
 *   onOpenChange?: (open: boolean) => void,
 *   className?: string
 * }} props
 */
export default function CategoryDropdown({
  selectedCategoryId,
  onCategoryChange,
  isSearchOpen = false,
  onCloseSearch,
  onOpenChange,
  className
}) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const { data: categories = [] } = useProductCategories();

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return PLACEHOLDER;
    return categories.find((category) => category.id === selectedCategoryId)?.name || 'Категория';
  }, [categories, selectedCategoryId]);

  const handleTriggerClick = useCallback(() => {
    if (isSearchOpen) {
      onCloseSearch?.();
      return;
    }
    setIsOpen((value) => !value);
  }, [isSearchOpen, onCloseSearch]);

  const handleSelect = useCallback(
    (categoryId) => {
      const isActive = selectedCategoryId === categoryId;
      onCategoryChange(isActive ? '' : categoryId);
      setIsOpen(false);
    },
    [selectedCategoryId, onCategoryChange]
  );

  useEffect(() => {
    if (!isOpen || isSearchOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) setIsOpen(false);
  }, [isSearchOpen]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className={clsx(
        'category-dropdown',
        'light',
        isOpen && !isSearchOpen && 'open',
        selectedCategoryId && 'filled',
        isSearchOpen && 'search-open',
        className
      )}
    >
      <select
        className="category-dropdown__native"
        value={selectedCategoryId}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="">{PLACEHOLDER}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <span
        role="button"
        tabIndex={0}
        onClick={handleTriggerClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleTriggerClick();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen && !isSearchOpen}
        aria-label={isSearchOpen ? 'Закрыть поиск' : selectedCategoryName}
      >
        {!isSearchOpen && selectedCategoryName}
        <span className="category-dropdown__hamburger-mid" aria-hidden="true" />
      </span>

      <ul role="listbox" aria-label="Категории">
        <li className={clsx(!selectedCategoryId && 'active')}>
          <a
            role="option"
            aria-selected={!selectedCategoryId}
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleSelect('');
            }}
          >
            {PLACEHOLDER}
          </a>
        </li>
        {categories.map((category) => (
          <li key={category.id} className={clsx(selectedCategoryId === category.id && 'active')}>
            <a
              role="option"
              aria-selected={selectedCategoryId === category.id}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                handleSelect(category.id);
              }}
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
