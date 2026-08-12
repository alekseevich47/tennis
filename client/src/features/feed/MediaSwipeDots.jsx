import React, { memo } from 'react';
import clsx from 'clsx';

const MAX_DOTS = 12;

/**
 * Индикатор слайдов альбома (точки как в магазине, иначе счётчик).
 *
 * @param {{
 *   count: number,
 *   activeIndex: number,
 *   onSelect?: (index: number) => void,
 *   className?: string
 * }} props
 */
function MediaSwipeDots({ count, activeIndex, onSelect, className }) {
  if (count <= 1) return null;

  if (count > MAX_DOTS) {
    return (
      <div className={clsx('media-swipe-counter', className)} aria-hidden="true">
        {activeIndex + 1} / {count}
      </div>
    );
  }

  return (
    <div className={clsx('media-swipe-dots', className)} aria-label="Слайды альбома">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          className={index === activeIndex ? 'is-active' : undefined}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(index);
          }}
          aria-label={`Показать медиа ${index + 1}`}
          aria-current={index === activeIndex ? 'true' : undefined}
        />
      ))}
    </div>
  );
}

export default memo(MediaSwipeDots);
