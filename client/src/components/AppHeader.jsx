import React, { memo, useEffect, useRef } from 'react';
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
 *   onOpenProduct?: (product: import('../services/catalog').ProductRecord) => void,
 *   onNotificationsClick?: () => void,
 *   searchConfig?: {
 *     open: boolean,
 *     query: string,
 *     onToggle: () => void,
 *     onChange: (query: string) => void,
 *     onClose: () => void,
 *     showDateSearch?: boolean
 *   }
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
  onOpenProduct,
  onNotificationsClick,
  searchConfig
}) {
  const favoritesAnchorRef = useRef(null);
  const searchInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const displayName = user?.full_name || user?.name || 'Гость';

  useEffect(() => {
    if (searchConfig?.open) {
      searchInputRef.current?.focus();
    }
  }, [searchConfig?.open]);

  const handleDatePick = (event) => {
    const value = event.target.value;
    if (!value || !searchConfig) return;
    const [year, month, day] = value.split('-');
    searchConfig.onChange(`${day}.${month}.${year}`);
    event.target.value = '';
  };

  return (
    <header className="app-header">
      {searchConfig?.open ? (
        <div className="header-search-row">
          <input
            ref={searchInputRef}
            type="search"
            className="header-search-input"
            value={searchConfig.query}
            onChange={(e) => searchConfig.onChange(e.target.value)}
            placeholder="Поиск…"
            aria-label="Поиск"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {searchConfig.showDateSearch ? (
            <>
              <input
                ref={dateInputRef}
                type="date"
                className="header-date-input-hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={handleDatePick}
              />
              <IconButton
                ariaLabel="Выбрать дату"
                variant="ghost"
                className="header-date-btn"
                onClick={() => dateInputRef.current?.showPicker?.()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </IconButton>
            </>
          ) : null}
          <IconButton
            ariaLabel="Закрыть поиск"
            variant="ghost"
            className="header-search-clear"
            onClick={searchConfig.onClose}
          >
            <span aria-hidden="true">✕</span>
          </IconButton>
        </div>
      ) : (
        <h1 className="header-title">{title}</h1>
      )}
      {onMembershipClick ? (
        <IconButton
          ariaLabel="Абонемент"
          variant="ghost"
          className="header-membership-btn"
          onClick={onMembershipClick}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
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
      {searchConfig && !searchConfig.open ? (
        <IconButton
          ariaLabel="Поиск"
          variant="ghost"
          className="header-search-btn"
          onClick={searchConfig.onToggle}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
        </IconButton>
      ) : null}
      {onNotificationsClick !== undefined && (
        <IconButton
          ariaLabel="Уведомления"
          variant="ghost"
          className="header-bell-btn"
          onClick={onNotificationsClick}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </IconButton>
      )}
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
