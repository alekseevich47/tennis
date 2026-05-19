import React from 'react';
import clsx from 'clsx';
import './EmptyState.css';

/**
 * @param {{
 *   title?: string,
 *   description?: string,
 *   icon?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string
 * }} props
 */
function EmptyState({ title, description, icon, children, className }) {
  return (
    <div className={clsx('ui-empty', className)} role="status">
      {icon && <div className="ui-empty-icon" aria-hidden="true">{icon}</div>}
      {title && <p className="ui-empty-title">{title}</p>}
      {description && <p className="ui-empty-desc">{description}</p>}
      {children}
    </div>
  );
}

export default EmptyState;
