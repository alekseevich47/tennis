import React from 'react';
import clsx from 'clsx';

/**
 * @param {{ count?: number, className?: string }} props
 */
function CommentListSkeleton({ count = 3, className = '' }) {
  return (
    <div className={clsx('comment-list-skeleton', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={clsx(
            'comment-list-skeleton__row',
            index % 2 === 0 ? 'comment-list-skeleton__row--other' : 'comment-list-skeleton__row--own'
          )}
        >
          <span className="comment-list-skeleton__bubble" />
        </div>
      ))}
    </div>
  );
}

export default CommentListSkeleton;
