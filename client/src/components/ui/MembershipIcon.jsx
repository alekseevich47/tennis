import React from 'react';
import clsx from 'clsx';
import cardIconUrl from '../../assets/card.png';
import './MembershipIcon.css';

/**
 * Иконка абонемента: серая как неактивный пункт BottomNav, синяя при active.
 *
 * @param {{
 *   active?: boolean,
 *   className?: string,
 *   size?: 'sm' | 'md'
 * }} props
 */
export default function MembershipIcon({ active = false, className, size = 'md' }) {
  return (
    <span
      className={clsx(
        'membership-icon',
        size === 'sm' && 'membership-icon--sm',
        active && 'membership-icon--active',
        className
      )}
      style={{ '--membership-icon-url': `url(${cardIconUrl})` }}
      aria-hidden="true"
    />
  );
}
