import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useProductCategories } from '../../hooks/useProductCategories';
import './CategoryDropdown.css';

const PLACEHOLDER = 'Все категории';
/** width 0.5s @ 0.9s delay */
const SEARCH_CLOSE_ANIM_MS = 1450;
const CATEGORY_EXPANDED_WIDTH = 200;

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
  const triggerRef = useRef(null);
  const labelMeasureRef = useRef(null);
  const pendingOpenRef = useRef(false);
  const pendingOpenTimerRef = useRef(null);
  const searchCloseAnimCleanupRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(true);
  const [isExpandingFromSearch, setIsExpandingFromSearch] = useState(false);
  const { data: categories = [] } = useProductCategories();

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return PLACEHOLDER;
    return categories.find((category) => category.id === selectedCategoryId)?.name || 'Категория';
  }, [categories, selectedCategoryId]);

  const cancelSearchCloseAnimation = useCallback(() => {
    searchCloseAnimCleanupRef.current?.();
    searchCloseAnimCleanupRef.current = null;
    if (pendingOpenTimerRef.current) {
      window.clearTimeout(pendingOpenTimerRef.current);
      pendingOpenTimerRef.current = null;
    }
  }, []);

  const clearPendingOpen = useCallback(() => {
    pendingOpenRef.current = false;
    cancelSearchCloseAnimation();
  }, [cancelSearchCloseAnimation]);

  const openAfterSearchClose = useCallback(() => {
    pendingOpenRef.current = false;
    cancelSearchCloseAnimation();
    setIsOpen(true);
  }, [cancelSearchCloseAnimation]);

  const scheduleOpenAfterSearchClose = useCallback(() => {
    const root = rootRef.current;
    if (!root || !pendingOpenRef.current) return;

    cancelSearchCloseAnimation();
    setIsExpandingFromSearch(true);

    let opened = false;
    const finish = () => {
      if (opened || !pendingOpenRef.current) return;
      if (root.offsetWidth < CATEGORY_EXPANDED_WIDTH) {
        pendingOpenTimerRef.current = window.setTimeout(finish, 50);
        return;
      }
      opened = true;
      searchCloseAnimCleanupRef.current?.();
      openAfterSearchClose();
      setIsExpandingFromSearch(false);
    };

    const handleTransitionEnd = (event) => {
      if (event.target !== root) return;
      if (event.propertyName !== 'width') return;
      finish();
    };

    root.addEventListener('transitionend', handleTransitionEnd);
    pendingOpenTimerRef.current = window.setTimeout(finish, SEARCH_CLOSE_ANIM_MS);
    searchCloseAnimCleanupRef.current = () => {
      root.removeEventListener('transitionend', handleTransitionEnd);
      if (pendingOpenTimerRef.current) {
        window.clearTimeout(pendingOpenTimerRef.current);
        pendingOpenTimerRef.current = null;
      }
      searchCloseAnimCleanupRef.current = null;
    };
  }, [cancelSearchCloseAnimation, openAfterSearchClose]);

  const handleTriggerClick = useCallback(() => {
    if (isSearchOpen) {
      pendingOpenRef.current = true;
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
    if (isSearchOpen) {
      clearPendingOpen();
      setIsOpen(false);
      setIsLabelVisible(false);
      setIsExpandingFromSearch(false);
      return;
    }

    if (pendingOpenRef.current) {
      scheduleOpenAfterSearchClose();
    }
  }, [isSearchOpen, clearPendingOpen, scheduleOpenAfterSearchClose]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (isSearchOpen) return undefined;

    const trigger = triggerRef.current;
    const measure = labelMeasureRef.current;
    if (!trigger || !measure) return undefined;

    const checkLabelFit = () => {
      if (isSearchOpen || trigger.clientWidth < 80) {
        setIsLabelVisible(false);
        return;
      }
      if (!isExpandingFromSearch) {
        setIsLabelVisible(true);
        return;
      }
      measure.textContent = selectedCategoryName;
      const textWidth = measure.offsetWidth;
      const availableWidth = trigger.clientWidth - 52;
      setIsLabelVisible(textWidth <= availableWidth);
    };

    checkLabelFit();

    const observer = new ResizeObserver(checkLabelFit);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [isSearchOpen, isExpandingFromSearch, selectedCategoryName]);

  useEffect(() => () => cancelSearchCloseAnimation(), [cancelSearchCloseAnimation]);

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
      <div ref={labelMeasureRef} className="category-dropdown__label-measure" aria-hidden="true" />

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
        ref={triggerRef}
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
        <span
          className={clsx(
            'category-dropdown__label',
            !isSearchOpen && isLabelVisible && 'visible'
          )}
        >
          {selectedCategoryName}
        </span>
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
