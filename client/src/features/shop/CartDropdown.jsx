import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useCart } from '../../context/CartContext';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import { createOrder } from '../../services/catalog';
import pb from '../../services/pb';
import { getMediaThumbUrl, mediaNames } from '../../lib/media';
import { error } from '../../lib/log';
import './CartDropdown.css';

/**
 * @param {Array<{ product: import('../../services/catalog').ProductRecord, quantity: number }>} cartItems
 * @returns {import('../../services/catalog').OrderItemRecord[]}
 */
function buildOrderItems(cartItems) {
  return cartItems.map(({ product }) => ({
    productId: product.id,
    title: product.title || '',
    price: typeof product.price === 'number' ? product.price : undefined,
    imageFileName: mediaNames(product.images)[0] || undefined,
    collectionId: product.collectionId,
    productCollectionId: product.collectionId
  }));
}

/**
 * @param {{
 *   entry: { product: import('../../services/catalog').ProductRecord, quantity: number },
 *   isRemoving: boolean,
 *   onOpen: (product: import('../../services/catalog').ProductRecord) => void,
 *   onRemove: (productId: string) => void,
 *   onTransitionEnd: (event: React.TransitionEvent<HTMLLIElement>) => void
 * }} props
 */
function CartDropdownItem({ entry, isRemoving, onOpen, onRemove, onTransitionEnd }) {
  const { product } = entry;
  const imageName = mediaNames(product.images)[0];
  const thumbUrl = imageName
    ? getMediaThumbUrl(product, 'products', imageName, '400x0')
    : null;

  return (
    <li
      className={clsx('cart-dropdown__item', isRemoving && 'cart-dropdown__item--removing')}
      onTransitionEnd={onTransitionEnd}
    >
      <button
        type="button"
        className="cart-dropdown__item-main"
        onClick={() => onOpen(product)}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="cart-dropdown__thumb" />
        ) : (
          <div className="cart-dropdown__thumb cart-dropdown__thumb--empty" aria-hidden="true" />
        )}
        <span className="cart-dropdown__title">{product.title}</span>
      </button>
      <button
        type="button"
        className="cart-dropdown__remove"
        aria-label={`Удалить ${product.title || 'товар'} из корзины`}
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
 *   cartAnchorRef: React.RefObject<HTMLElement | null>
 * }} props
 */
export default function CartDropdown({
  open,
  onClose,
  onOpenProduct,
  cartAnchorRef
}) {
  const { items, removeItem, clearCart } = useCart();
  const { showToast } = useToast();
  const { alert } = useAlertDialog();
  const dropdownRef = useRef(null);
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [isVisible, setIsVisible] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      setRemovingIds(new Set());
      return undefined;
    }

    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dropdownRef.current?.contains(target)) return;
      if (cartAnchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onClose, cartAnchorRef]);

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

  const handleCheckout = useCallback(async () => {
    const userId = pb.authStore.model?.id;
    if (!userId) {
      await alert({
        title: 'Нужна авторизация',
        message: 'Оформить заказ может только авторизованный пользователь.'
      });
      return;
    }
    if (items.length === 0 || isCheckingOut) return;

    setIsCheckingOut(true);
    try {
      await createOrder({
        user: userId,
        items: buildOrderItems(items)
      });
      clearCart();
      onClose();
      showToast({ text: 'Заказ оформлен' });
    } catch (err) {
      error('Оформление заказа:', err);
      await alert({
        title: 'Не удалось оформить заказ',
        message: 'Попробуйте ещё раз чуть позже.'
      });
    } finally {
      setIsCheckingOut(false);
    }
  }, [items, isCheckingOut, clearCart, onClose, showToast, alert]);

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className={clsx('cart-dropdown', isVisible && 'cart-dropdown--visible')}
      role="dialog"
      aria-label="Корзина"
    >
      {items.length === 0 ? (
        <p className="cart-dropdown__empty">Корзина пуста</p>
      ) : (
        <>
          <ul className="cart-dropdown__list">
            {items.map((entry) => (
              <CartDropdownItem
                key={entry.product.id}
                entry={entry}
                isRemoving={removingIds.has(entry.product.id)}
                onOpen={handleOpenProduct}
                onRemove={handleRemove}
                onTransitionEnd={(event) => handleItemTransitionEnd(entry.product.id, event)}
              />
            ))}
          </ul>
          <button
            type="button"
            className="cart-dropdown__checkout"
            disabled={isCheckingOut}
            onClick={handleCheckout}
          >
            {isCheckingOut ? 'Оформляем…' : 'Купить'}
          </button>
        </>
      )}
    </div>
  );
}
