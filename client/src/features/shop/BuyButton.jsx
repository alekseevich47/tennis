import React, { useCallback } from 'react';
import clsx from 'clsx';
import { useToast } from '../../components/ui/ToastContext';
import { MAX_SELLER_URL } from '../../config';
import { error } from '../../lib/log';
import pb from '../../services/pb';
import {
  buildBuyMessage,
  BUY_MOBILE_TOAST_ACTION_LABEL,
  BUY_TOAST_TEXT,
  isMobileMaxPlatform,
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

  const handleBuy = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;

    const items = products ?? (product ? [product] : []);
    const message = buildBuyMessage(items);
    if (!message) return;

    try {
      await navigator.clipboard.writeText(message);
    } catch (err) {
      error('copy buy message:', err);
    }

    const productIds = items.map((item) => item.id).filter(Boolean);
    if (productIds.length) {
      pb.send('/api/audit-buy-click', {
        method: 'POST',
        body: { productIds }
      }).catch(() => {});
    }

    if (isMobileMaxPlatform()) {
      showToast({
        text: BUY_TOAST_TEXT,
        actionLabel: BUY_MOBILE_TOAST_ACTION_LABEL,
        onAction: () => openSellerChat(MAX_SELLER_URL)
      });
      return;
    }

    openSellerChat(MAX_SELLER_URL);
    showToast({ text: BUY_TOAST_TEXT });
  }, [disabled, product, products, showToast]);

  return (
    <button
      type="button"
      className={clsx('buy-button', className)}
      onClick={handleBuy}
      disabled={disabled}
    >
      Купить
    </button>
  );
}
