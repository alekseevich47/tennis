import React from 'react';
import clsx from 'clsx';
import { useFavorites } from '../../context/FavoritesContext';
import './FavoriteIcon.css';

/**
 * @param {{ onClick?: () => void, className?: string }} props
 */
export default function FavoriteIcon({ onClick, className }) {
  const { totalCount } = useFavorites();

  return (
    <button
      type="button"
      className={clsx('favorite-icon-btn', className)}
      onClick={onClick}
      aria-label={`Избранное${totalCount > 0 ? `, ${totalCount} товаров` : ''}`}
    >
      <svg
        className="favorite-icon-btn__heart"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8b98a5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {totalCount > 0 ? (
        <span className="favorite-icon-btn__badge" aria-hidden="true">
          {totalCount}
        </span>
      ) : null}
    </button>
  );
}
