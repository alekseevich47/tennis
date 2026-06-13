import React, { memo, useRef } from 'react';
import Avatar from './ui/Avatar';
import IconButton from './ui/IconButton';
import FavoriteIcon from '../features/shop/FavoriteIcon';
import FavoritesDropdown from '../features/shop/FavoritesDropdown';
import './AppHeader.css';

/**
 * @param {{
 *   title: string,
 *   user?: import('../lib/avatar').UserAvatarLike | null,
 *   onProfileClick: () => void,
 *   onMembershipClick?: () => void,
 *   showShopControls?: boolean,
 *   favoritesCount?: number,
 *   onFavoritesClick?: () => void,
 *   favoritesDropdownOpen?: boolean,
 *   onFavoritesDropdownClose?: () => void,
 *   onOpenProduct?: (product: import('../services/catalog').ProductRecord) => void
 * }} props
 */
function AppHeader({
  title,
  user,
  onProfileClick,
  onMembershipClick,
  showShopControls = false,
  onFavoritesClick,
  favoritesDropdownOpen = false,
  onFavoritesDropdownClose,
  onOpenProduct
}) {
  const favoritesAnchorRef = useRef(null);
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
          <div ref={favoritesAnchorRef} className="header-favorites-anchor">
            <FavoriteIcon onClick={onFavoritesClick} />
            <FavoritesDropdown
              open={favoritesDropdownOpen}
              onClose={onFavoritesDropdownClose}
              onOpenProduct={onOpenProduct}
              favoritesAnchorRef={favoritesAnchorRef}
            />
          </div>
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
