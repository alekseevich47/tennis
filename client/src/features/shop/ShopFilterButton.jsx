import React from 'react';
import clsx from 'clsx';
import './ShopFilterButton.css';

/**
 * @param {{
 *   activeCount?: number,
 *   onClick?: () => void,
 *   className?: string
 * }} props
 */
export default function ShopFilterButton({ activeCount = 0, onClick, className }) {
  const isActive = activeCount > 0;

  return (
    <button
      type="button"
      className={clsx(
        'shop-filter-btn',
        isActive && 'shop-filter-btn--active',
        className
      )}
      onClick={onClick}
      aria-label={
        isActive
          ? `Фильтры, активных: ${activeCount}`
          : 'Фильтры'
      }
      aria-pressed={isActive}
    >
      <svg
        className="shop-filter-btn__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
        <circle cx="9" cy="7" r="2.25" />
        <circle cx="15" cy="12" r="2.25" />
        <circle cx="11" cy="17" r="2.25" />
      </svg>
      {isActive ? (
        <span className="shop-filter-btn__badge" aria-hidden="true">
          {activeCount > 9 ? '9+' : activeCount}
        </span>
      ) : null}
    </button>
  );
}
