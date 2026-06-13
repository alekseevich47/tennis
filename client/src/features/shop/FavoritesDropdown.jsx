import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useFavorites } from '../../context/FavoritesContext';
import { getMediaThumbUrl, mediaNames } from '../../lib/media';
import BuyButton from './BuyButton';
import './FavoritesDropdown.css';

/**
 * @param {{
 *   entry: { product: import('../../services/catalog').ProductRecord, quantity: number },
 *   isRemoving: boolean,
 *   onOpen: (product: import('../../services/catalog').ProductRecord) => void,
 *   onRemove: (productId: string) => void,
 *   onTransitionEnd: (event: React.TransitionEvent<HTMLLIElement>) => void
 * }} props
 */
function FavoritesDropdownItem({ entry, isRemoving, onOpen, onRemove, onTransitionEnd }) {
  const { product } = entry;
  const imageName = mediaNames(product.images)[0];
  const thumbUrl = imageName
    ? getMediaThumbUrl(product, 'products', imageName, '400x0')
    : null;

  return (
    <li
      className={clsx('favorites-dropdown__item', isRemoving && 'favorites-dropdown__item--removing')}
      onTransitionEnd={onTransitionEnd}
    >
      <button
        type="button"
        className="favorites-dropdown__item-main"
        onClick={() => onOpen(product)}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="favorites-dropdown__thumb" />
        ) : (
          <div className="favorites-dropdown__thumb favorites-dropdown__thumb--empty" aria-hidden="true" />
        )}
        <span className="favorites-dropdown__title">{product.title}</span>
      </button>
      <button
        type="button"
        className="favorites-dropdown__remove"
        aria-label={`Удалить ${product.title || 'товар'} из избранного`}
        onClick={(event) => {
          event.stopPropagation();
          onRemove(product.id);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onOpenProduct?: (product: import('../../services/catalog').ProductRecord) => void,
 *   favoritesAnchorRef: React.RefObject<HTMLElement | null>
 * }} props
 */
export default function FavoritesDropdown({
  open,
  onClose,
  onOpenProduct,
  favoritesAnchorRef
}) {
  const { items, removeItem } = useFavorites();
  const dropdownRef = useRef(null);
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    return undefined;
  }, [open]);

  const handleDropdownTransitionEnd = useCallback((event) => {
    if (event.target !== dropdownRef.current) return;
    if (event.propertyName !== 'opacity') return;
    if (open) return;

    setMounted(false);
    setRemovingIds(new Set());
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const anchor = favoritesAnchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const anchorRect = anchor.getBoundingClientRect();
    const dropdownWidth = dropdown.offsetWidth;
    const top = anchorRect.bottom + 8;
    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - dropdownWidth - 8));

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  }, [open, favoritesAnchorRef]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dropdownRef.current?.contains(target)) return;
      if (favoritesAnchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onClose, favoritesAnchorRef]);

  const handleRemove = useCallback((productId) => {
    setRemovingIds((current) => new Set([...current, productId]));
  }, []);

  const handleItemTransitionEnd = useCallback(
    (productId, event) => {
      if (event.propertyName !== 'max-height') return;
      if (!removingIds.has(productId)) return;

      removeItem(productId);
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    },
    [removingIds, removeItem]
  );

  const handleOpenProduct = useCallback(
    (product) => {
      onOpenProduct?.(product);
      onClose();
    },
    [onOpenProduct, onClose]
  );

  if (!mounted) return null;

  return (
    <div
      ref={dropdownRef}
      className={clsx('favorites-dropdown', isVisible && 'favorites-dropdown--visible')}
      role="dialog"
      aria-label="Избранное"
      aria-hidden={!open}
      onTransitionEnd={handleDropdownTransitionEnd}
    >
      {items.length === 0 ? (
        <p className="favorites-dropdown__empty">Избранное пусто</p>
      ) : (
        <ul className="favorites-dropdown__list">
          {items.map((entry) => (
            <FavoritesDropdownItem
              key={entry.product.id}
              entry={entry}
              isRemoving={removingIds.has(entry.product.id)}
              onOpen={handleOpenProduct}
              onRemove={handleRemove}
              onTransitionEnd={(event) => handleItemTransitionEnd(entry.product.id, event)}
            />
          ))}
        </ul>
      )}
      <BuyButton
        className="favorites-dropdown__checkout"
        products={items.map((entry) => entry.product)}
        disabled={items.length === 0}
      />
    </div>
  );
}
