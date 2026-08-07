import React, { memo, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import IconButton from './ui/IconButton';
import FavoriteIcon from '../features/shop/FavoriteIcon';
import FavoritesDropdown from '../features/shop/FavoritesDropdown';
import NotificationsDropdown from '../features/notifications/NotificationsDropdown';
import DatePickerModal from '../features/trainings/components/DatePickerModal';
import { formatDateForSearch } from '../lib/datePickerUtils';
import MembershipIcon from './ui/MembershipIcon';
import './AppHeader.css';

/**
 * @param {{
 *   title: string,
 *   onMembershipClick?: () => void,
 *   membershipVisible?: boolean,
 *   membershipActive?: boolean,
 *   showShopControls?: boolean,
 *   favoritesCount?: number,
 *   onFavoritesClick?: () => void,
 *   favoritesDropdownOpen?: boolean,
 *   onFavoritesDropdownClose?: () => void,
 *   onOpenProduct?: (product: import('../services/catalog').ProductRecord) => void,
 *   onNotificationsClick?: () => void,
 *   unreadCount?: number,
 *   hasUnread?: boolean,
 *   notificationsDropdownOpen?: boolean,
 *   onNotificationsDropdownClose?: () => void,
 *   notifications?: Record<string, unknown>[],
 *   onNotificationsMutate?: () => void,
 *   userId?: string,
 *   onOpenTrainingFromNotification?: (trainingId: string) => void,
 *   onOpenMembershipFromNotification?: () => void,
 *   onOpenBookingFromNotification?: () => void,
 *   onOpenCommentFromNotification?: (meta: Record<string, unknown>) => void,
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
  onMembershipClick,
  membershipVisible = true,
  membershipActive = false,
  showShopControls = false,
  onFavoritesClick,
  favoritesDropdownOpen = false,
  onFavoritesDropdownClose,
  onOpenProduct,
  onNotificationsClick,
  unreadCount = 0,
  hasUnread = false,
  notificationsDropdownOpen = false,
  onNotificationsDropdownClose,
  notifications = [],
  onNotificationsMutate,
  userId,
  onOpenTrainingFromNotification,
  onOpenMembershipFromNotification,
  onOpenBookingFromNotification,
  onOpenCommentFromNotification,
  searchConfig
}) {
  const favoritesAnchorRef = useRef(null);
  const notificationsAnchorRef = useRef(null);
  const searchInputRef = useRef(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (searchConfig?.open) {
      searchInputRef.current?.focus();
    }
  }, [searchConfig?.open]);

  const handleDateConfirm = (date) => {
    if (!searchConfig) return;
    searchConfig.onChange(formatDateForSearch(date));
  };

  return (
    <header className="app-header">
      {searchConfig?.open ? (
        <div className="header-search-row">
          <div
            className={
              searchConfig.showDateSearch
                ? 'header-search-field header-search-field--with-date'
                : 'header-search-field'
            }
          >
            <input
              ref={searchInputRef}
              type="search"
              className="header-search-input"
              value={searchConfig.query}
              onChange={(e) => searchConfig.onChange(e.target.value)}
              placeholder="Поиск"
              aria-label="Поиск"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="header-search-field-actions">
              {searchConfig.showDateSearch ? (
                <IconButton
                  ariaLabel="Выбрать дату"
                  variant="ghost"
                  size="sm"
                  className="header-date-btn"
                  onClick={() => setDatePickerOpen(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </IconButton>
              ) : null}
              <IconButton
                ariaLabel="Закрыть поиск"
                variant="ghost"
                size="sm"
                className="header-search-clear"
                onClick={searchConfig.onClose}
              >
                <span aria-hidden="true">✕</span>
              </IconButton>
            </div>
          </div>
        </div>
      ) : (
        <h1 className="header-title">{title}</h1>
      )}
      <div className="header-end-group">
        {showShopControls ? (
          <div ref={favoritesAnchorRef} className="header-favorites-anchor">
            <FavoriteIcon onClick={onFavoritesClick} />
            <FavoritesDropdown
              open={favoritesDropdownOpen}
              onClose={onFavoritesDropdownClose}
              onOpenProduct={onOpenProduct}
              favoritesAnchorRef={favoritesAnchorRef}
            />
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
        {onMembershipClick ? (
          <IconButton
            ariaLabel="Абонемент"
            variant="ghost"
            className={clsx(
              'header-membership-btn',
              membershipActive && 'header-membership-btn--active',
              !membershipVisible && 'header-membership-btn--hidden'
            )}
            onClick={onMembershipClick}
            aria-hidden={!membershipVisible}
            tabIndex={membershipVisible ? undefined : -1}
          >
            <MembershipIcon active={membershipActive} size="sm" />
          </IconButton>
        ) : null}
        {onNotificationsClick !== undefined && (
          <div ref={notificationsAnchorRef} className="header-notifications-anchor">
            <IconButton
              ariaLabel={`Уведомления${unreadCount > 0 ? `, ${unreadCount} непрочитанных` : ''}`}
              variant="ghost"
              className={clsx('header-bell-btn', hasUnread && 'header-bell-btn--shake')}
              onClick={onNotificationsClick}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="header-bell-btn__badge" aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </IconButton>
            {userId && onNotificationsDropdownClose && onNotificationsMutate ? (
              <NotificationsDropdown
                open={notificationsDropdownOpen}
                onClose={onNotificationsDropdownClose}
                userId={userId}
                notifications={notifications}
                onMutate={onNotificationsMutate}
                notificationsAnchorRef={notificationsAnchorRef}
                onOpenTraining={onOpenTrainingFromNotification}
                onOpenMembership={onOpenMembershipFromNotification}
                onOpenBooking={onOpenBookingFromNotification}
                onOpenComment={onOpenCommentFromNotification}
              />
            ) : null}
          </div>
        )}
      </div>
      {searchConfig?.showDateSearch ? (
        <DatePickerModal
          isOpen={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          onConfirm={handleDateConfirm}
        />
      ) : null}
    </header>
  );
}

export default memo(AppHeader);
