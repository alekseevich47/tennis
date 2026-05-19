import React, { memo } from 'react';
import Avatar from './ui/Avatar';
import './AppHeader.css';

/**
 * @param {{
 *   title: string,
 *   user?: import('../lib/avatar').UserAvatarLike | null,
 *   onProfileClick: () => void
 * }} props
 */
function AppHeader({ title, user, onProfileClick }) {
  const displayName = user?.full_name || user?.name || 'Гость';
  return (
    <header className="app-header">
      <h1 className="header-title">{title}</h1>
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
