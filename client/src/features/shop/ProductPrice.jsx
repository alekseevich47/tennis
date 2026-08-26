import React from 'react';
import clsx from 'clsx';

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function normalizeOldPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {{
 *   price?: number | string | null,
 *   oldPrice?: number | string | null,
 *   className?: string,
 *   currentClassName?: string,
 *   oldClassName?: string
 * }} props
 */
export default function ProductPrice({
  price,
  oldPrice,
  className,
  currentClassName = 'product-price-current',
  oldClassName = 'product-price-old'
}) {
  const old = normalizeOldPrice(oldPrice);

  return (
    <p className={clsx('product-price-row', className)}>
      <span className={currentClassName}>{price} ₽</span>
      {old != null && (
        <span className={oldClassName}>{old} ₽</span>
      )}
    </p>
  );
}
