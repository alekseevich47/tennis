import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { videoPreviewUrl } from '../../lib/media';
import MediaProgressRing from './MediaProgressRing';

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 10;
const LIFT_PX = 6;
const DWELL_MS = 260;
const EDGE_ZONE_PX = 44;
const EDGE_MAX_SPEED = 18;
const REMOVE_MS = 280;

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
 * @param {HTMLElement | null} el
 * @returns {HTMLElement | null}
 */
function findStripScrollParent(el) {
  let node = el?.parentElement || null;
  while (node) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Превью: long-press → DnD; tap → onItemClick; strip — edge auto-scroll при drag.
 *
 * @param {{
 *   items: SortableMediaItem[],
 *   onReorder: (next: SortableMediaItem[]) => void,
 *   className?: string,
 *   layout?: 'grid' | 'strip',
 *   enabled?: boolean,
 *   getAction?: (item: SortableMediaItem) => React.ReactNode,
 *   onItemClick?: (item: SortableMediaItem, index: number, event: React.SyntheticEvent) => void,
 *   onRemove?: (key: string) => void
 * }} props
 */
function SortableMediaPreviewGrid({
  items,
  onReorder,
  className,
  layout = 'grid',
  enabled = true,
  getAction,
  onItemClick,
  onRemove
}) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [dragKey, setDragKey] = useState(/** @type {string | null} */ (null));
  const [lifted, setLifted] = useState(false);
  const [dropIndex, setDropIndex] = useState(/** @type {number | null} */ (null));
  const [exitingKeys, setExitingKeys] = useState(/** @type {Record<string, true>} */ ({}));
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
     *   grabX: number,
     *   grabY: number,
     *   itemW: number,
     *   itemH: number,
     *   longPressTimer: ReturnType<typeof setTimeout> | null,
     *   dwellTimer: ReturnType<typeof setTimeout> | null,
     *   dragging: boolean,
     *   lifted: boolean,
     *   suppressClick: boolean,
     *   dropIndex: number,
     *   lastClientX: number,
     *   lastClientY: number,
     *   edgeRaf: number | null
     * } | null} */ (null)
  );

  const clearTimer = useCallback((field) => {
    const session = sessionRef.current;
    if (!session) return;
    if (session[field] != null) {
      clearTimeout(/** @type {ReturnType<typeof setTimeout>} */ (session[field]));
      session[field] = null;
    }
  }, []);

  const stopEdgeScroll = useCallback(() => {
    const session = sessionRef.current;
    if (session?.edgeRaf != null) {
      cancelAnimationFrame(session.edgeRaf);
      session.edgeRaf = null;
    }
  }, []);

  const applyReorder = useCallback(
    (fromIndex, toIndex) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false;
      const list = itemsRef.current.slice();
      if (fromIndex >= list.length || toIndex >= list.length) return false;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      onReorder(list);
      return true;
    },
    [onReorder]
  );

  const computeDropIndex = useCallback(
    (clientX, clientY, excludeKey) => {
      const root = rootRef.current;
      if (!root) return -1;
      const orderKeys = itemsRef.current
        .filter((item) => !exitingKeys[item.key])
        .map((item) => item.key);
      if (!orderKeys.length) return -1;

      const nodes = orderKeys
        .map((key) => root.querySelector(`.sortable-media-item[data-sortable-key="${CSS.escape(key)}"]`))
        .filter(Boolean);

      if (layout === 'strip') {
        for (let i = 0; i < nodes.length; i += 1) {
          const rect = /** @type {HTMLElement} */ (nodes[i]).getBoundingClientRect();
          if (clientX < rect.left + rect.width / 2) return i;
        }
        return nodes.length - 1;
      }

      let best = orderKeys.indexOf(excludeKey);
      let bestDist = Infinity;
      nodes.forEach((node, i) => {
        if (orderKeys[i] === excludeKey) return;
        const rect = /** @type {HTMLElement} */ (node).getBoundingClientRect();
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
    [exitingKeys, layout]
  );

  const commitDwell = useCallback(() => {
    const session = sessionRef.current;
    if (!session?.dragging) return;
    const from = itemsRef.current.findIndex((item) => item.key === session.key);
    if (from < 0) return;
    const to = session.dropIndex;
    if (to < 0 || to === from) return;
    if (applyReorder(from, to)) {
      session.fromIndex = to;
    }
  }, [applyReorder]);

  const scheduleDwell = useCallback(
    (nextDrop) => {
      const session = sessionRef.current;
      if (!session) return;
      clearTimer('dwellTimer');
      session.dropIndex = nextDrop;
      setDropIndex(nextDrop);
      const from = itemsRef.current.findIndex((item) => item.key === session.key);
      if (nextDrop === from || nextDrop < 0) return;
      session.dwellTimer = setTimeout(() => {
        commitDwell();
      }, DWELL_MS);
    },
    [clearTimer, commitDwell]
  );

  const tickEdgeScroll = useCallback(() => {
    const session = sessionRef.current;
    if (!session?.dragging || !session.lifted || layout !== 'strip') {
      stopEdgeScroll();
      return;
    }
    const scrollEl = findStripScrollParent(rootRef.current);
    if (!scrollEl) {
      stopEdgeScroll();
      return;
    }
    const rect = scrollEl.getBoundingClientRect();
    const x = session.lastClientX;
    let speed = 0;
    if (x < rect.left + EDGE_ZONE_PX) {
      const t = 1 - Math.max(0, (x - rect.left) / EDGE_ZONE_PX);
      speed = -EDGE_MAX_SPEED * (0.35 + 0.65 * t * t);
    } else if (x > rect.right - EDGE_ZONE_PX) {
      const t = 1 - Math.max(0, (rect.right - x) / EDGE_ZONE_PX);
      speed = EDGE_MAX_SPEED * (0.35 + 0.65 * t * t);
    }

    if (speed !== 0) {
      scrollEl.scrollLeft += speed;
      const nextDrop = computeDropIndex(session.lastClientX, session.lastClientY, session.key);
      if (nextDrop >= 0 && nextDrop !== session.dropIndex) {
        scheduleDwell(nextDrop);
      }
      session.edgeRaf = requestAnimationFrame(tickEdgeScroll);
    } else {
      session.edgeRaf = null;
    }
  }, [computeDropIndex, layout, scheduleDwell, stopEdgeScroll]);

  const ensureEdgeScroll = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.edgeRaf != null) return;
    session.edgeRaf = requestAnimationFrame(tickEdgeScroll);
  }, [tickEdgeScroll]);

  const endSession = useCallback(
    (/** @type {React.PointerEvent | null} */ event) => {
      const session = sessionRef.current;
      if (!session) return;
      clearTimer('longPressTimer');
      clearTimer('dwellTimer');
      stopEdgeScroll();
      if (event && event.currentTarget?.hasPointerCapture?.(session.pointerId)) {
        try {
          event.currentTarget.releasePointerCapture(session.pointerId);
        } catch {
          /* ignore */
        }
      }
      // Финальный commit, если dwell ещё не успел
      if (session.dragging && session.lifted) {
        const from = itemsRef.current.findIndex((item) => item.key === session.key);
        if (from >= 0 && session.dropIndex >= 0 && session.dropIndex !== from) {
          applyReorder(from, session.dropIndex);
        }
      }
      sessionRef.current = null;
      setDragKey(null);
      setLifted(false);
      setDropIndex(null);
      setGhost(null);
    },
    [applyReorder, clearTimer, stopEdgeScroll]
  );

  const startDragging = useCallback((key, fromIndex, el) => {
    const session = sessionRef.current;
    if (!session || session.key !== key) return;
    session.dragging = true;
    session.suppressClick = true;
    session.lifted = false;
    session.dropIndex = fromIndex;
    setDragKey(key);
    setLifted(false);
    setDropIndex(fromIndex);
    try {
      el.setPointerCapture(session.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const liftItem = useCallback((clientX, clientY) => {
    const session = sessionRef.current;
    if (!session || !session.dragging || session.lifted) return;
    session.lifted = true;
    setLifted(true);
    const item = itemsRef.current.find((entry) => entry.key === session.key);
    if (!item) return;
    setGhost({
      key: session.key,
      x: clientX - session.grabX,
      y: clientY - session.grabY,
      w: session.itemW,
      h: session.itemH,
      url: item.url,
      isVideo: item.isVideo
    });
  }, []);

  const onItemPointerDown = useCallback(
    (/** @type {React.PointerEvent<HTMLElement>} */ event, key, index) => {
      if (event.button != null && event.button !== 0) return;
      const target = /** @type {HTMLElement | null} */ (event.target);
      if (target?.closest?.('.media-remove-btn')) return;

      clearTimer('longPressTimer');
      clearTimer('dwellTimer');
      stopEdgeScroll();

      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      const canSort = enabled && itemsRef.current.filter((i) => !exitingKeys[i.key]).length > 1;

      sessionRef.current = {
        key,
        fromIndex: index,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        grabX: event.clientX - rect.left,
        grabY: event.clientY - rect.top,
        itemW: rect.width,
        itemH: rect.height,
        longPressTimer: canSort
          ? setTimeout(() => {
              startDragging(key, index, el);
            }, LONG_PRESS_MS)
          : null,
        dwellTimer: null,
        dragging: false,
        lifted: false,
        suppressClick: false,
        dropIndex: index,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        edgeRaf: null
      };
    },
    [clearTimer, enabled, exitingKeys, startDragging, stopEdgeScroll]
  );

  const onItemPointerMove = useCallback(
    (/** @type {React.PointerEvent} */ event) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      session.lastClientX = event.clientX;
      session.lastClientY = event.clientY;

      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      const dist = Math.hypot(dx, dy);

      if (!session.dragging) {
        if (layout === 'strip' && Math.abs(dx) > MOVE_CANCEL_PX && Math.abs(dx) > Math.abs(dy) * 1.1) {
          clearTimer('longPressTimer');
          sessionRef.current = null;
          return;
        }
        if (dist > MOVE_CANCEL_PX) {
          clearTimer('longPressTimer');
          // сессию оставляем только для отмены click при скролле? null — иначе ложный click
          sessionRef.current = null;
        }
        return;
      }

      event.preventDefault();

      if (!session.lifted) {
        if (dist >= LIFT_PX) {
          liftItem(event.clientX, event.clientY);
        } else {
          return;
        }
      }

      setGhost((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - session.grabX,
              y: event.clientY - session.grabY
            }
          : prev
      );

      const nextDrop = computeDropIndex(event.clientX, event.clientY, session.key);
      if (nextDrop >= 0 && nextDrop !== session.dropIndex) {
        scheduleDwell(nextDrop);
      }

      if (layout === 'strip') {
        ensureEdgeScroll();
      }
    },
    [
      clearTimer,
      computeDropIndex,
      ensureEdgeScroll,
      layout,
      liftItem,
      scheduleDwell
    ]
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

  const beginRemove = useCallback(
    (key) => {
      if (!onRemove || exitingKeys[key]) return;
      setExitingKeys((prev) => ({ ...prev, [key]: true }));
    },
    [exitingKeys, onRemove]
  );

  const completeRemove = useCallback(
    (key) => {
      setExitingKeys((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        queueMicrotask(() => onRemove?.(key));
        return next;
      });
    },
    [onRemove]
  );

  useEffect(() => {
    const keys = Object.keys(exitingKeys);
    if (!keys.length) return undefined;
    const timer = window.setTimeout(() => {
      keys.forEach((key) => completeRemove(key));
    }, REMOVE_MS + 40);
    return () => window.clearTimeout(timer);
  }, [completeRemove, exitingKeys]);

  useEffect(() => {
    if (!dragKey) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const scrollEl = findStripScrollParent(rootRef.current);
    const prevTouchAction = scrollEl?.style.touchAction || '';
    if (scrollEl) scrollEl.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (scrollEl) scrollEl.style.touchAction = prevTouchAction;
    };
  }, [dragKey]);

  if (!items.length) return null;

  const canSort = enabled && items.filter((i) => !exitingKeys[i.key]).length > 1;

  return (
    <div
      ref={rootRef}
      className={clsx(
        'sortable-media-preview',
        layout === 'strip' && 'sortable-media-preview--strip',
        layout === 'grid' && 'sortable-media-preview--grid',
        layout === 'grid' && `telegram-media-grid telegram-media-grid--${Math.min(items.length, 5)}`,
        dragKey && 'sortable-media-preview--dragging',
        dragKey && lifted && 'sortable-media-preview--lifted',
        className
      )}
    >
      {items.map((item, index) => {
        const status = item.status || (item.url ? 'ready' : 'loading');
        const isExiting = Boolean(exitingKeys[item.key]);
        const isDragging = dragKey === item.key;
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

        const action =
          onRemove && !getAction ? (
            <button
              type="button"
              className="media-remove-btn comment-media-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                beginRemove(item.key);
              }}
              aria-label={`Убрать ${item.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : (
            getAction?.(item)
          );

        return (
          <figure
            key={item.key}
            className={clsx(
              'sortable-media-item',
              'telegram-media-item',
              isDragging && 'is-sortable-dragging',
              isDragging && !lifted && 'is-sortable-armed',
              isDragging && lifted && 'is-sortable-lifted',
              dragKey && dropIndex === index && dragKey !== item.key && 'is-sortable-drop-target',
              isExiting && 'is-sortable-exiting'
            )}
            data-sortable-key={item.key}
            onPointerDown={(e) => onItemPointerDown(e, item.key, index)}
            onPointerMove={onItemPointerMove}
            onPointerUp={(e) => onItemPointerUp(e, item, index)}
            onPointerCancel={(e) => endSession(e)}
            onTransitionEnd={(e) => {
              if (!isExiting) return;
              if (e.target !== e.currentTarget) return;
              if (e.propertyName !== 'opacity') return;
              completeRemove(item.key);
            }}
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
            {action}
          </figure>
        );
      })}

      {ghost && lifted ? (
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
