import React, { memo } from 'react';
import clsx from 'clsx';
import { getUserAvatarData } from '../../lib/avatar';
import './Avatar.css';

/**
 * @param {{
 *   user?: import('../../lib/avatar').UserAvatarLike | null,
 *   size?: 'sm' | 'md' | 'lg',
 *   className?: string,
 *   alt?: string
 * }} props
 */
function Avatar({ user, size = 'sm', className, alt }) {
  const data = getUserAvatarData(user);
  const fullAlt = alt || (user?.full_name || user?.name || 'Пользователь');

  return (
    <div className={clsx('ui-avatar', `ui-avatar--${size}`, className)}>
      {data.hasAvatar ? (
        <img src={data.src} alt={`Аватар пользователя ${fullAlt}`} className="ui-avatar-img" />
      ) : (
        <div className="ui-avatar-fallback" aria-label={`Аватар пользователя ${fullAlt}`}>
          {data.initial}
        </div>
      )}
    </div>
  );
}

export default memo(Avatar);
