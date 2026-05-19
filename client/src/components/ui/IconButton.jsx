import React, { forwardRef } from 'react';
import clsx from 'clsx';
import './IconButton.css';

/**
 * Кнопка-иконка с обязательным `aria-label` и адекватной hit-area (M8, M9).
 *
 * Props:
 * - `ariaLabel` (string, required)
 * - `onClick`
 * - `className`
 * - `disabled`
 * - `type` (default 'button')
 * - `variant` ('ghost' | 'soft' | 'danger', default 'ghost')
 * - `size` ('sm' | 'md' | 'lg', default 'md')
 * - `children` — содержимое (обычно SVG или emoji + aria-hidden)
 */
const IconButton = forwardRef(function IconButton(
  {
    ariaLabel,
    onClick,
    className,
    disabled = false,
    type = 'button',
    variant = 'ghost',
    size = 'md',
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={clsx('ui-icon-btn', `ui-icon-btn--${variant}`, `ui-icon-btn--${size}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
