import React from 'react';
import clsx from 'clsx';
import './MembershipDebtDot.css';

/**
 * Кружок статуса долга посещения (история абонемента / ростер тренировки).
 * Красный пульс = unpaid; зелёный = погашен / возвращён.
 *
 * @param {{
 *   paid: boolean,
 *   readonly?: boolean,
 *   disabled?: boolean,
 *   ariaLabel: string,
 *   onClick?: () => void,
 *   className?: string,
 * }} props
 */
export default function MembershipDebtDot({
  paid,
  readonly = false,
  disabled = false,
  ariaLabel,
  onClick,
  className
}) {
  const interactive = !readonly && typeof onClick === 'function';

  return (
    <button
      type="button"
      className={clsx(
        'membership-ledger-debt-dot',
        paid
          ? 'membership-ledger-debt-dot--paid'
          : 'membership-ledger-debt-dot--unpaid',
        readonly && 'membership-ledger-debt-dot--readonly',
        className
      )}
      aria-label={ariaLabel}
      disabled={!interactive || disabled}
      tabIndex={interactive ? 0 : -1}
      onClick={() => {
        if (!interactive) return;
        onClick();
      }}
    />
  );
}
