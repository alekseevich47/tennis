import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';
import MediaProgressRing from './MediaProgressRing';

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 10;

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
 * Превью: long-press → DnD; tap → onItemClick; strip scroll без ложных DnD.
 * Порядок меняется только на drop (без live-swap — без «прыжков»).
 *
 * @param {{
 *   items: SortableMediaItem[],
 *   onReorder: (next: SortableMediaItem[]) => void,
 *   className?: string,
 *   layout?: 'grid' | 'strip',
 *   enabled?: boolean,
 *   getAction?: (item: SortableMediaItem) => React.ReactNode,
 *   onItemClick?: (item: SortableMediaItem, index: number, event: React.SyntheticEvent) => void
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
  const [dropIndex, setDropIndex] = useState(/** @type {number | null} */ (null));
  const [ghost, setGhost] = useState(
    /** @type {{ key: string, x: number, y: number, w: number, h: number, url: string, isVideo: boolean } | null} */ (
      null
    )
  );

  const sessionRef = useRef(
    /** @type {{
     *   key: string,
     *   fromIndex: number,
     *   pointerId: number,
     *   startX: number,
     *   startY: number,
     *   longPressTimer: ReturnType<typeof setTimeout> | null,
     *   dragging: boolean,
     *   suppressClick: boolean,
     *   dropIndex: number
     * } | null} */ (null)
  );

  const clearTimer = useCallback(() => {
    const session = sessionRef.current;
    if (session?.longPressTimer != null) {
      clearTimeout(session.longPressTimer);
      session.longPressTimer = null;
    }
  }, []);

  const computeDropIndex = useCallback(
    (clientX, clientY, fromIndex) => {
      const root = rootRef.current;
      if (!root) return fromIndex;
      const nodes = Array.from(root.querySelectorAll('.sortable-media-item[data-sortable-key]'));
      if (!nodes.length) return fromIndex;

      if (layout === 'strip') {
        for (let i = 0; i < nodes.length; i += 1) {
          const rect = nodes[i].getBoundingClientRect();
          const mid = rect.left + rect.width / 2;
          if (clientX < mid) return i;
        }
        return nodes.length - 1;
      }

      let best = fromIndex;
      let bestDist = Infinity;
      nodes.forEach((node, i) => {
        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(clientX - cx, clientY - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    },
    [layout]
  );

  const applyDrop = useCallback(
    (fromIndex, toIndex) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      const list = itemsRef.current.slice();
      if (fromIndex >= list.length || toIndex >= list.length) return;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      onReorder(list);
    },
    [onReorder]
  );

  const endSession = useCallback(
    (/** @type {React.PointerEvent | null} */ event) => {
      const session = sessionRef.current;
      if (!session) return;
      clearTimer();
      if (event && event.currentTarget?.hasPointerCapture?.(session.pointerId)) {
        try {
          event.currentTarget.releasePointerCapture(session.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (session.dragging) {
        applyDrop(session.fromIndex, session.dropIndex);
      }
      sessionRef.current = null;
      setDragKey(null);
      setDropIndex(null);
      setGhost(null);
    },
    [applyDrop, clearTimer]
  );

  const startDragging = useCallback((key, fromIndex, clientX, clientY, el) => {
    const session = sessionRef.current;
    if (!session || session.key !== key) return;
    session.dragging = true;
    session.suppressClick = true;
    session.dropIndex = fromIndex;
    setDragKey(key);
    setDropIndex(fromIndex);
    const rect = el?.getBoundingClientRect?.();
    const item = itemsRef.current.find((entry) => entry.key === key);
    if (rect && item) {
      setGhost({
        key,
        x: clientX - rect.width / 2,
        y: clientY - rect.height / 2,
        w: rect.width,
        h: rect.height,
        url: item.url,
        isVideo: item.isVideo
      });
    }
  }, []);

  const onItemPointerDown = useCallback(
    (/** @type {React.PointerEvent<HTMLElement>} */ event, key, index) => {
      if (!enabled || itemsRef.current.length < 2) return;
      if (event.button != null && event.button !== 0) return;
      const target = /** @type {HTMLElement | null} */ (event.target);
      if (target?.closest?.('.media-remove-btn')) return;

      clearTimer();
      const el = event.currentTarget;
      sessionRef.current = {
        key,
        fromIndex: index,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        longPressTimer: setTimeout(() => {
          startDragging(key, index, event.clientX, event.clientY, el);
          try {
            el.setPointerCapture(event.pointerId);
          } catch {
            /* ignore */
          }
        }, LONG_PRESS_MS),
        dragging: false,
        suppressClick: false,
        dropIndex: index
      };
    },
    [clearTimer, enabled, startDragging]
  );

  const onItemPointerMove = useCallback(
    (/** @type {React.PointerEvent} */ event) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      const dist = Math.hypot(dx, dy);

      if (!session.dragging) {
        if (layout === 'strip' && Math.abs(dx) > MOVE_CANCEL_PX && Math.abs(dx) > Math.abs(dy) * 1.1) {
          clearTimer();
          sessionRef.current = null;
          return;
        }
        if (dist > MOVE_CANCEL_PX) {
          clearTimer();
          sessionRef.current = null;
        }
        return;
      }

      event.preventDefault();
      setGhost((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - prev.w / 2,
              y: event.clientY - prev.h / 2
            }
          : prev
      );

      const nextDrop = computeDropIndex(event.clientX, event.clientY, session.fromIndex);
      if (nextDrop !== session.dropIndex) {
        session.dropIndex = nextDrop;
        setDropIndex(nextDrop);
      }
    },
    [clearTimer, computeDropIndex, layout]
  );

  const onItemPointerUp = useCallback(
    (/** @type {React.PointerEvent} */ event, item, index) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      const wasDragging = session.dragging;
      const suppress = session.suppressClick;
      endSession(event);

      if (!wasDragging && !suppress) {
        onItemClick?.(item, index, event);
      }
    },
    [endSession, onItemClick]
  );

  useEffect(() => {
    if (!dragKey) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [dragKey]);

  if (!items.length) return null;

  const canSort = enabled && items.length > 1;

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

        return (
          <figure
            key={item.key}
            className={clsx(
              'sortable-media-item',
              'telegram-media-item',
              dragKey === item.key && 'is-sortable-dragging',
              dragKey && dropIndex === index && dragKey !== item.key && 'is-sortable-drop-target'
            )}
            data-sortable-key={item.key}
            onPointerDown={(e) => onItemPointerDown(e, item.key, index)}
            onPointerMove={onItemPointerMove}
            onPointerUp={(e) => onItemPointerUp(e, item, index)}
            onPointerCancel={(e) => endSession(e)}
            style={
              layout === 'strip'
                ? { touchAction: dragKey ? 'none' : 'pan-x' }
                : canSort
                  ? { touchAction: dragKey ? 'none' : 'manipulation' }
                  : undefined
            }
          >
            <div
              className="media-frame"
              role={onItemClick ? 'button' : undefined}
              tabIndex={onItemClick ? 0 : undefined}
              aria-label={
                onItemClick
                  ? item.isVideo
                    ? `Открыть видео ${item.name}`
                    : `Открыть фото ${item.name}`
                  : undefined
              }
            >
              {media}
            </div>
            {getAction?.(item)}
          </figure>
        );
      })}

      {ghost ? (
        <div
          className="sortable-media-ghost"
          style={{
            left: ghost.x,
            top: ghost.y,
            width: ghost.w,
            height: ghost.h
          }}
          aria-hidden="true"
        >
          {ghost.isVideo ? (
            <video src={videoPreviewUrl(ghost.url)} muted playsInline />
          ) : (
            <img src={ghost.url} alt="" draggable={false} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default SortableMediaPreviewGrid;
