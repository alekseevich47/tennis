import React, { useId, useState } from 'react';
import clsx from 'clsx';

const PREVIEW_COUNT = 3;

/**
 * Сворачиваемая история: список сверху-вниз (новые → старые);
 * свёрнуто — первые N строк, развёрнуто — все.
 *
 * @param {{
 *   title: string,
 *   items: React.ReactNode[],
 *   className?: string,
 *   listClassName?: string,
 *   defaultExpanded?: boolean
 * }} props
 */
function CollapsibleHistorySection({
  title,
  items,
  className,
  listClassName,
  defaultExpanded = false
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const total = items.length;
  if (!total) return null;

  const canCollapse = total > PREVIEW_COUNT;
  const visible = !canCollapse || expanded ? items : items.slice(0, PREVIEW_COUNT);

  return (
    <div className={clsx('membership-history-section', className)}>
      <button
        type="button"
        className="membership-history-section__toggle"
        aria-expanded={canCollapse ? expanded : true}
        aria-controls={panelId}
        disabled={!canCollapse}
        onClick={() => {
          if (!canCollapse) return;
          setExpanded((v) => !v);
        }}
      >
        <strong>{title}</strong>
        {canCollapse && (
          <span className="membership-history-section__chevron" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </button>
      <div
        id={panelId}
        className={clsx(
          'membership-history-section__panel',
          expanded || !canCollapse
            ? 'membership-history-section__panel--open'
            : 'membership-history-section__panel--collapsed'
        )}
      >
        <ul className={clsx('membership-history-section__list', listClassName)}>{visible}</ul>
      </div>
    </div>
  );
}

export default CollapsibleHistorySection;
