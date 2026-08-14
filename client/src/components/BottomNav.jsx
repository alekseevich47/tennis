import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Avatar from './ui/Avatar';
import { useTriggerAddAction } from '../context/AddActionContext';
import './BottomNav.css';

/** Индекс скрытого раздела «Галерея» — код страницы остаётся, в меню не показываем. */
export const GALLERY_TAB_INDEX = 4;
export const PROFILE_TAB_INDEX = 5;
export const ADMIN_TAB_INDEX = 6;

// Иконки hoisted в модульный const массив (фикс H5: больше не пересоздаются на каждом рендере).
// `label` — подпись под иконкой + aria-label.
// Галерея (GALLERY_TAB_INDEX) скрыта из меню; вместо неё — Профиль.
const NAV_ITEMS = [
  {
    label: 'Лента',
    tabIndex: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    )
  },
  {
    label: 'Запись',
    tabIndex: 1,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
      </svg>
    )
  },
  {
    label: 'Магазин',
    tabIndex: 2,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
      </svg>
    )
  },
  {
    label: 'Турнир',
    tabIndex: 3,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
      </svg>
    )
  },
  {
    label: 'Профиль',
    tabIndex: PROFILE_TAB_INDEX,
    isProfile: true
  }
];

/** Скрытый раздел — не в меню; оставлен для deep link / будущего возврата. */
export const GALLERY_NAV_ITEM = {
  label: 'Галерея',
  tabIndex: GALLERY_TAB_INDEX,
  icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z" />
    </svg>
  )
};

const ADMIN_NAV_ITEM = {
  label: 'Админ',
  tabIndex: ADMIN_TAB_INDEX,
  icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  )
};

export const BOTTOM_NAV_ITEMS = NAV_ITEMS;

/**
 * @param {{
 *   activeTab: number,
 *   onTabChange: (idx: number) => void,
 *   showAdmin?: boolean,
 *   user?: import('../lib/avatar').UserAvatarLike | null
 * }} props
 */
function BottomNav({ activeTab, onTabChange, showAdmin = false, user = null }) {
  const navRef = useRef(/** @type {HTMLElement | null} */ (null));
  const itemRefs = useRef(/** @type {Map<number, HTMLButtonElement>} */ (new Map()));
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const triggerAdd = useTriggerAddAction();
  const leadingItems = NAV_ITEMS.slice(0, 3);
  const trailingItems = NAV_ITEMS.slice(3);

  const setItemRef = (index, el) => {
    if (el) itemRefs.current.set(index, el);
    else itemRefs.current.delete(index);
  };

  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeEl = itemRefs.current.get(activeTab);
    if (!nav || !activeEl) {
      setIndicator((prev) => (prev.ready ? { left: 0, width: 0, ready: false } : prev));
      return undefined;
    }

    const update = () => {
      const navRect = nav.getBoundingClientRect();
      const btnRect = activeEl.getBoundingClientRect();
      setIndicator({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
        ready: true
      });
    };

    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(nav);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [activeTab, showAdmin]);

  useEffect(() => {
    // После появления админ-кнопки пересчитать индикатор в следующем кадре
    if (!showAdmin) return undefined;
    const id = window.requestAnimationFrame(() => {
      const nav = navRef.current;
      const activeEl = itemRefs.current.get(activeTab);
      if (!nav || !activeEl) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = activeEl.getBoundingClientRect();
      setIndicator({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
        ready: true
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [showAdmin, activeTab]);

  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <div ref={navRef} className="bottom-nav__pill">
        <span className="bottom-nav__glass" aria-hidden="true" />
        <span
          className={clsx(
            'bottom-nav__indicator',
            indicator.ready && 'bottom-nav__indicator--ready'
          )}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width
          }}
          aria-hidden="true"
        />
        {leadingItems.map((item) => {
          const isActive = activeTab === item.tabIndex;
          return (
            <button
              key={item.label}
              ref={(el) => setItemRef(item.tabIndex, el)}
              type="button"
              className={clsx('nav-item', isActive && 'active')}
              data-nav-index={item.tabIndex}
              onClick={() => onTabChange(item.tabIndex)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span className="nav-item__label">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="nav-item nav-item--add"
          aria-label="Добавить"
          onClick={() => triggerAdd()}
        >
          <span className="nav-item--add__stage" aria-hidden="true">
            <span className="nav-item--add__wash" />
            <span className="nav-item--add__blob nav-item--add__blob--a" />
            <span className="nav-item--add__blob nav-item--add__blob--b" />
            <span className="nav-item--add__blob nav-item--add__blob--c" />
            <span className="nav-item--add__blob nav-item--add__blob--d" />
          </span>
          <span className="nav-item--add__plus" aria-hidden="true">
            +
          </span>
        </button>
        {trailingItems.map((item) => {
          const isActive = activeTab === item.tabIndex;
          return (
            <button
              key={item.label}
              ref={(el) => setItemRef(item.tabIndex, el)}
              type="button"
              className={clsx(
                'nav-item',
                item.isProfile && 'nav-item--profile',
                isActive && 'active'
              )}
              data-nav-index={item.tabIndex}
              onClick={() => onTabChange(item.tabIndex)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.isProfile ? (
                <Avatar user={user} size="sm" className="nav-item__avatar" />
              ) : (
                item.icon
              )}
              <span className="nav-item__label">{item.label}</span>
            </button>
          );
        })}
        {showAdmin && (
          <button
            ref={(el) => setItemRef(ADMIN_TAB_INDEX, el)}
            type="button"
            className={clsx('nav-item', activeTab === ADMIN_TAB_INDEX && 'active')}
            data-nav-index={ADMIN_TAB_INDEX}
            onClick={() => onTabChange(ADMIN_TAB_INDEX)}
            aria-label={ADMIN_NAV_ITEM.label}
            aria-current={activeTab === ADMIN_TAB_INDEX ? 'page' : undefined}
          >
            {ADMIN_NAV_ITEM.icon}
            <span className="nav-item__label">{ADMIN_NAV_ITEM.label}</span>
          </button>
        )}
      </div>
    </nav>
  );
}

export default memo(BottomNav);
