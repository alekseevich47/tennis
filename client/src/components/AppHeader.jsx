import React, { memo, useRef } from 'react';
import Avatar from './ui/Avatar';
import IconButton from './ui/IconButton';
import CartIcon from '../features/shop/CartIcon';
import CartDropdown from '../features/shop/CartDropdown';
import './AppHeader.css';

/**
 * @param {{
 *   title: string,
 *   user?: import('../lib/avatar').UserAvatarLike | null,
 *   onProfileClick: () => void,
 *   onMembershipClick?: () => void,
 *   showShopControls?: boolean,
 *   cartCount?: number,
 *   onCartClick?: () => void,
 *   onOrdersClick?: () => void,
 *   cartDropdownOpen?: boolean,
 *   onCartDropdownClose?: () => void,
 *   onOpenProduct?: (product: import('../services/catalog').ProductRecord) => void
 * }} props
 */
function AppHeader({
  title,
  user,
  onProfileClick,
  onMembershipClick,
  showShopControls = false,
  cartCount = 0,
  onCartClick,
  onOrdersClick,
  cartDropdownOpen = false,
  onCartDropdownClose,
  onOpenProduct
}) {
  const cartAnchorRef = useRef(null);
  const displayName = user?.full_name || user?.name || 'Гость';
  return (
    <header className="app-header">
      <h1 className="header-title">{title}</h1>
      {onMembershipClick ? (
        <IconButton
          ariaLabel="Абонемент"
          variant="ghost"
          className="header-membership-btn"
          onClick={onMembershipClick}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" aria-hidden="true">
            <path d="M4 8h16v8H4z" />
            <path d="M4 8a2 2 0 100-4v4z" />
            <path d="M20 8a2 2 0 110-4v4z" />
            <path d="M4 16a2 2 0 100 4v-4z" />
            <path d="M20 16a2 2 0 110 4v-4z" />
          </svg>
        </IconButton>
      ) : null}
      {showShopControls ? (
        <div className="header-shop-controls">
          <div ref={cartAnchorRef} className="header-cart-anchor">
            <CartIcon onClick={onCartClick} />
            <CartDropdown
              open={cartDropdownOpen}
              onClose={onCartDropdownClose}
              onOpenProduct={onOpenProduct}
              cartAnchorRef={cartAnchorRef}
            />
          </div>
          <IconButton
            ariaLabel="Мои заказы"
            variant="ghost"
            className="header-orders-btn"
            onClick={onOrdersClick}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </IconButton>
        </div>
      ) : null}
      <button
        type="button"
        className="header-profile-badge"
        onClick={onProfileClick}
        aria-label={`Открыть мой профиль (${displayName})`}
      >
        <Avatar user={user} size="sm" />
        <span className="profile-name-mini">{displayName}</span>
      </button>
    </header>
  );
}

export default memo(AppHeader);
