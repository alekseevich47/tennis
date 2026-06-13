import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useToast } from '../../components/ui/ToastContext';
import { MAX_SELLER_URL } from '../../config';
import { error } from '../../lib/log';
import {
  buildBuyMessage,
  BUY_REDIRECT_DELAY_MS,
  BUY_REDIRECT_TOAST_TEXT,
  openSellerChat
} from './buyMessage';
import './BuyButton.css';

/**
 * @param {{
 *   className?: string,
 *   product?: import('../../services/catalog').ProductRecord | null,
 *   products?: import('../../services/catalog').ProductRecord[],
 *   disabled?: boolean
 * }} props
 */
export default function BuyButton({ className, product = null, products, disabled = false }) {
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const redirectTimerRef = useRef(null);

  const handleBuy = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || isPending) return;

    const items = products ?? (product ? [product] : []);
    const message = buildBuyMessage(items);
    if (!message) return;

    setIsPending(true);

    redirectTimerRef.current = window.setTimeout(() => {
      redirectTimerRef.current = null;
      setIsPending(false);
      openSellerChat(MAX_SELLER_URL);
    }, BUY_REDIRECT_DELAY_MS);

    try {
      await navigator.clipboard.writeText(message);
    } catch (err) {
      error('copy buy message:', err);
    }

    showToast({ text: BUY_REDIRECT_TOAST_TEXT });
  }, [disabled, isPending, product, products, showToast]);

  useEffect(() => () => {
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
    }
  }, []);

  return (
    <button
      type="button"
      className={clsx('buy-button', className)}
      onClick={handleBuy}
      disabled={disabled || isPending}
    >
      Купить
    </button>
  );
}
