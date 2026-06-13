import React, { useCallback } from 'react';
import clsx from 'clsx';
import { MAX_SELLER_URL } from '../../config';
import './BuyButton.css';

/**
 * @param {{ className?: string }} props
 */
export default function BuyButton({ className }) {
  const handleBuy = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (window.WebApp?.openLink) {
      window.WebApp.openLink(MAX_SELLER_URL);
    } else {
      window.open(MAX_SELLER_URL, '_blank');
    }
  }, []);

  return (
    <button type="button" className={clsx('buy-button', className)} onClick={handleBuy}>
      Купить
    </button>
  );
}
