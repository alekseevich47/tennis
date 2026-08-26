import React, { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import MediaPreviewGrid from './MediaPreviewGrid';
import MediaProgressRing from './MediaProgressRing';

gsap.registerPlugin(Flip);

/**
 * @typedef {{
 *   key: string,
 *   url: string,
 *   name: string,
 *   isVideo: boolean,
 *   status?: 'loading' | 'ready' | 'error',
 *   progress?: number | null,
 *   error?: string
 * }} SortableMediaItem
 */

/**
 * MediaPreviewGrid + pointer drag&drop reorder (FLIP).
 *
 * @param {{
 *   items: SortableMediaItem[],
 *   onReorder: (next: SortableMediaItem[]) => void,
 *   className?: string,
 *   showCaption?: boolean,
 *   originKeyPrefix?: string,
 *   enabled?: boolean,
 *   getAction?: (item: SortableMediaItem) => React.ReactNode,
 *   onItemClick?: (item: any, index: number, event: React.MouseEvent) => void
 * }} props
 */
function SortableMediaPreviewGrid({
  items,
  onReorder,
  className,
  showCaption = false,
  originKeyPrefix = 'sortable',
  enabled = true,
  getAction,
  onItemClick
}) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [dragKey, setDragKey] = useState(/** @type {string | null} */ (null));
  const dragRef = useRef(
    /** @type {{ key: string, pointerId: number, startX: number, startY: number, moved: boolean } | null} */ (
      null
    )
  );

  const reorderByKey = useCallback(
    (fromKey, toKey) => {
      if (fromKey === toKey) return;
      const current = itemsRef.current;
      const from = current.findIndex((item) => item.key === fromKey);
      const to = current.findIndex((item) => item.key === toKey);
      if (from < 0 || to < 0 || from === to) return;

      const root = rootRef.current;
      const state = root ? Flip.getState(root.querySelectorAll('.telegram-media-item')) : null;
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
      if (state) {
        requestAnimationFrame(() => {
          Flip.from(state, {
            duration: 0.28,
            ease: 'power2.out',
            absolute: true,
            nested: true
          });
        });
      }
    },
    [onReorder]
  );

  const findItemKeyAtPoint = useCallback((clientX, clientY) => {
    const root = rootRef.current;
    if (!root) return null;
    const figures = root.querySelectorAll('.telegram-media-item[data-sortable-key]');
    for (const el of figures) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return el.getAttribute('data-sortable-key');
      }
    }
    return null;
  }, []);

  const onPointerDownCapture = useCallback(
    (/** @type {React.PointerEvent} */ event) => {
      if (!enabled || itemsRef.current.length < 2) return;
      if (event.button != null && event.button !== 0) return;
      const target = /** @type {HTMLElement | null} */ (event.target);
      if (!target) return;
      if (target.closest('button.media-remove-btn, .media-remove-btn')) return;
      const figure = target.closest('.telegram-media-item[data-sortable-key]');
      if (!figure) return;
      const key = figure.getAttribute('data-sortable-key');
      if (!key) return;

      dragRef.current = {
        key,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
      setDragKey(key);
      try {
        figure.setPointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled]
  );

  const onPointerMoveCapture = useCallback(
    (/** @type {React.PointerEvent} */ event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 8) return;
      drag.moved = true;
      event.preventDefault();
      const overKey = findItemKeyAtPoint(event.clientX, event.clientY);
      if (overKey && overKey !== drag.key) {
        reorderByKey(drag.key, overKey);
        drag.key = overKey;
        setDragKey(overKey);
      }
    },
    [findItemKeyAtPoint, reorderByKey]
  );

  const endDrag = useCallback((/** @type {React.PointerEvent} */ event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragKey(null);
  }, []);

  const decoratedGetAction = useCallback(
    (item) => {
      const action = getAction?.(item);
      if (item.status === 'loading') {
        return (
          <>
            <span className="sortable-media-loading" aria-hidden="true">
              <MediaProgressRing progress={item.progress ?? null} />
            </span>
            {action}
          </>
        );
      }
      return action;
    },
    [getAction]
  );

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      className={clsx('sortable-media-preview', dragKey && 'sortable-media-preview--dragging')}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={endDrag}
      onPointerCancelCapture={endDrag}
    >
      <MediaPreviewGrid
        items={items.map((item) => ({
          ...item,
          // прокидываем ключ на figure через name-hack нельзя — оборачиваем CSS attribute via className on grid
        }))}
        className={clsx(className, 'sortable-media-preview__grid')}
        showCaption={showCaption}
        originKeyPrefix={originKeyPrefix}
        onItemClick={
          onItemClick
            ? (item, index, event) => {
                if (dragRef.current?.moved) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                onItemClick(item, index, event);
              }
            : undefined
        }
        getAction={decoratedGetAction}
      />
      {/* data-sortable-key на figure — через mutation после paint */}
      <SortableKeyBinder items={items} rootRef={rootRef} dragKey={dragKey} />
    </div>
  );
}

/**
 * Вешает data-sortable-key на figure MediaPreviewGrid без форка сетки.
 */
function SortableKeyBinder({ items, rootRef, dragKey }) {
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const figures = root.querySelectorAll('.telegram-media-item');
    figures.forEach((figure, index) => {
      const item = items[index];
      if (!item) return;
      figure.setAttribute('data-sortable-key', item.key);
      figure.classList.toggle('is-sortable-dragging', dragKey === item.key);
    });
  }, [items, rootRef, dragKey]);
  return null;
}

export default SortableMediaPreviewGrid;
