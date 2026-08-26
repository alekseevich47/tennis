import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { videoPreviewUrl } from '../../lib/media';
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
 * Собственная сетка превью с рабочим pointer drag&drop.
 *
 * @param {{
 *   items: SortableMediaItem[],
 *   onReorder: (next: SortableMediaItem[]) => void,
 *   className?: string,
 *   layout?: 'grid' | 'strip',
 *   enabled?: boolean,
 *   getAction?: (item: SortableMediaItem) => React.ReactNode,
 *   onItemClick?: (item: SortableMediaItem, index: number, event: React.MouseEvent) => void
 * }} props
 */
function SortableMediaPreviewGrid({
  items,
  onReorder,
  className,
  layout = 'grid',
  enabled = true,
  getAction,
  onItemClick
}) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [dragKey, setDragKey] = useState(/** @type {string | null} */ (null));
  const dragRef = useRef(
    /** @type {{
     *   key: string,
     *   pointerId: number,
     *   startX: number,
     *   startY: number,
     *   moved: boolean,
     *   originIndex: number
     * } | null} */ (null)
  );

  const reorderByKey = useCallback(
    (fromKey, toKey) => {
      if (fromKey === toKey) return;
      const current = itemsRef.current;
      const from = current.findIndex((item) => item.key === fromKey);
      const to = current.findIndex((item) => item.key === toKey);
      if (from < 0 || to < 0 || from === to) return;

      const root = rootRef.current;
      const state = root
        ? Flip.getState(root.querySelectorAll('.sortable-media-item'))
        : null;
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
      if (state) {
        requestAnimationFrame(() => {
          Flip.from(state, {
            duration: 0.24,
            ease: 'power2.out',
            absolute: true
          });
        });
      }
    },
    [onReorder]
  );

  const findKeyAtPoint = useCallback((clientX, clientY) => {
    const root = rootRef.current;
    if (!root) return null;
    const nodes = root.querySelectorAll('.sortable-media-item[data-sortable-key]');
    for (const el of nodes) {
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

  const endDrag = useCallback((/** @type {React.PointerEvent} */ event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = /** @type {HTMLElement | null} */ (event.currentTarget);
    if (target?.hasPointerCapture?.(event.pointerId)) {
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
    setDragKey(null);
  }, []);

  const onItemPointerDown = useCallback(
    (/** @type {React.PointerEvent<HTMLElement>} */ event, key) => {
      if (!enabled || itemsRef.current.length < 2) return;
      if (event.button != null && event.button !== 0) return;
      const target = /** @type {HTMLElement | null} */ (event.target);
      if (target?.closest?.('.media-remove-btn, button')) return;

      const originIndex = itemsRef.current.findIndex((item) => item.key === key);
      dragRef.current = {
        key,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        originIndex
      };
      setDragKey(key);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled]
  );

  const onItemPointerMove = useCallback(
    (/** @type {React.PointerEvent} */ event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
      }
      event.preventDefault();
      const overKey = findKeyAtPoint(event.clientX, event.clientY);
      if (overKey && overKey !== drag.key) {
        reorderByKey(drag.key, overKey);
        drag.key = overKey;
        setDragKey(overKey);
      }
    },
    [findKeyAtPoint, reorderByKey]
  );

  useEffect(() => {
    if (!dragKey) return undefined;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.userSelect = prev;
    };
  }, [dragKey]);

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      className={clsx(
        'sortable-media-preview',
        layout === 'strip' && 'sortable-media-preview--strip',
        layout === 'grid' && 'sortable-media-preview--grid',
        layout === 'grid' && `telegram-media-grid telegram-media-grid--${Math.min(items.length, 5)}`,
        dragKey && 'sortable-media-preview--dragging',
        className
      )}
    >
      {items.map((item, index) => {
        const status = item.status || (item.url ? 'ready' : 'loading');
        let media = null;
        if (status === 'loading') {
          media = (
            <div className="sortable-media-item__skeleton" aria-label="Загрузка">
              <MediaProgressRing progress={item.progress ?? null} />
            </div>
          );
        } else if (status === 'error' || !item.url) {
          media = (
            <div className="sortable-media-item__error" role="alert">
              {item.error || 'Ошибка'}
            </div>
          );
        } else if (item.isVideo) {
          media = (
            <div className="telegram-video-preview">
              <video
                src={videoPreviewUrl(item.url)}
                preload="metadata"
                playsInline
                muted
                disablePictureInPicture
                aria-label={item.name}
              />
              <span className="post-media-play-badge" aria-hidden="true">
                ▶
              </span>
            </div>
          );
        } else {
          media = <img src={item.url} alt={item.name} draggable={false} />;
        }

        const canOpen = Boolean(onItemClick) && status === 'ready' && Boolean(item.url);

        return (
          <figure
            key={item.key}
            className={clsx(
              'sortable-media-item',
              'telegram-media-item',
              dragKey === item.key && 'is-sortable-dragging'
            )}
            data-sortable-key={item.key}
            onPointerDown={(e) => onItemPointerDown(e, item.key)}
            onPointerMove={onItemPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={enabled && items.length > 1 ? { touchAction: 'none' } : undefined}
          >
            {canOpen ? (
              <button
                type="button"
                className="telegram-media-item__open"
                onClick={(event) => {
                  if (dragRef.current?.moved) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  onItemClick?.(item, index, event);
                }}
                aria-label={item.isVideo ? `Открыть видео ${item.name}` : `Открыть фото ${item.name}`}
              >
                <div className="media-frame">{media}</div>
              </button>
            ) : (
              <div className="media-frame">{media}</div>
            )}
            {getAction?.(item)}
          </figure>
        );
      })}
    </div>
  );
}

export default SortableMediaPreviewGrid;
