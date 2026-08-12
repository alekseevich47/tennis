// @ts-check
import clsx from 'clsx';
import { usePullToRefreshState } from './PullToRefresh';
import './FloatingAddButton.css';

/**
 * FAB «Добавить»: sticky + hide/show по скроллу; при PTR держится у верха
 * (компенсация offset), на время refresh плавно скрывается; liquid glass.
 *
 * @param {{
 *   visible?: boolean,
 *   onClick?: () => void,
 *   children?: React.ReactNode,
 *   className?: string,
 *   ariaLabel?: string
 * }} props
 */
export default function FloatingAddButton({
  visible = true,
  onClick,
  children = 'Добавить',
  className,
  ariaLabel = 'Добавить'
}) {
  const { offset, refreshing, springing } = usePullToRefreshState();
  const show = Boolean(visible) && !refreshing;

  return (
    <div
      className={clsx('floating-btn-wrapper', offset > 0 && 'floating-btn-wrapper--ptr')}
      style={{
        marginTop: offset > 0 ? -offset : 0,
        transition: springing
          ? 'margin-top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)'
          : undefined
      }}
    >
      <button
        type="button"
        className={clsx(
          'floating-add-btn',
          'floating-add-btn--glass',
          show ? 'visible' : 'hidden',
          className
        )}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        <span className="floating-add-btn__glass" aria-hidden="true" />
        <span className="floating-add-btn__label">{children}</span>
      </button>
    </div>
  );
}
