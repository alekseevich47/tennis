import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { videoPreviewUrl } from '../../lib/media';
import MediaProgressRing from './MediaProgressRing';

gsap.registerPlugin(Flip);

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 10;
const LIFT_MOVE_PX = 4;
const EDGE_ZONE_PX = 56;
const EDGE_MAX_SPEED = 22;
const REMOVE_MS = 280;
const FLIP_MS = 0.28;
const GHOST_SCALE = 1.08;

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
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * @param {string[]} keys
 * @param {string} key
 * @param {number} toIndex
 * @returns {string[]}
 */
function moveKeyToIndex(keys, key, toIndex) {
  const from = keys.indexOf(key);
  if (from < 0 || toIndex < 0 || toIndex >= keys.length || from === toIndex) return keys;
  const next = keys.slice();
  next.splice(from, 1);
  next.splice(toIndex, 0, key);
  return next;
}

/**
 * Превью: long-press → lift ghost → live примерка слота (Flip) → commit на pointerup.
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
  const [dragOrder, setDragOrder] = useState(/** @type {string[] | null} */ (null));
  const [exitingKeys, setExitingKeys] = useState(/** @type {Record<string, true>} */ ({}));
  const [ghost, setGhost] = useState(
    /** @type {{ key: string, x: number, y: number, w: number, h: number, url: string, isVideo: boolean } | null} */ (
      null
    )
  );

  const sessionRef = useRef(
    /** @type {{
     *   key: string,
     *   pointerId: number,
     *   startX: number,
     *   startY: number,
     *   grabX: number,
     *   grabY: number,
     *   itemW: number,
     *   itemH: number,
     *   longPressTimer: ReturnType<typeof setTimeout> | null,
     *   dragging: boolean,
     *   lifted: boolean,
     *   suppressClick: boolean,
     *   orderKeys: string[],
     *   originKeys: string[],
     *   lastClientX: number,
     *   lastClientY: number,
     *   edgeRaf: number | null,
     *   flipState: ReturnType<typeof Flip.getState> | null
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

  const activeKeys = useCallback(() => {
    return itemsRef.current.filter((item) => !exitingKeys[item.key]).map((item) => item.key);
  }, [exitingKeys]);

  const displayItems = useMemo(() => {
    if (!dragOrder) return items;
    const byKey = new Map(items.map((item) => [item.key, item]));
    return dragOrder.map((key) => byKey.get(key)).filter(Boolean);
  }, [dragOrder, items]);

  const computeDropIndex = useCallback(
    (clientX, clientY, orderKeys, activeKey) => {
      const root = rootRef.current;
      if (!root || !orderKeys.length) return -1;

      const nodes = orderKeys
        .map((key) =>
          root.querySelector(`.sortable-media-item[data-sortable-key="${CSS.escape(key)}"]`)
        )
        .filter(Boolean);

      if (!nodes.length) return -1;

      for (let i = 0; i < nodes.length; i += 1) {
        const rect = /** @type {HTMLElement} */ (nodes[i]).getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return i;
        }
      }

      if (layout === 'strip') {
        let best = 0;
        let bestDist = Infinity;
        nodes.forEach((node, i) => {
          const rect = /** @type {HTMLElement} */ (node).getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const dist = Math.abs(clientX - cx);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        return best;
      }

      let best = Math.max(0, orderKeys.indexOf(activeKey));
      let bestDist = Infinity;
      nodes.forEach((node, i) => {
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
    [layout]
  );

  const captureFlipState = useCallback(() => {
    const root = rootRef.current;
    const session = sessionRef.current;
    if (!root || !session) return;
    const nodes = root.querySelectorAll(
      '.sortable-media-item:not(.is-sortable-lifted):not(.is-sortable-exiting)'
    );
    if (!nodes.length) {
      session.flipState = null;
      return;
    }
    session.flipState = Flip.getState(nodes);
  }, []);

  const applyLiveOrder = useCallback(
    (nextKeys) => {
      const session = sessionRef.current;
      if (!session) return;
      const prev = session.orderKeys;
      if (
        prev.length === nextKeys.length &&
        prev.every((key, i) => key === nextKeys[i])
      ) {
        return;
      }
      captureFlipState();
      session.orderKeys = nextKeys;
      setDragOrder(nextKeys);
    },
    [captureFlipState]
  );

  useLayoutEffect(() => {
    const session = sessionRef.current;
    const state = session?.flipState;
    if (!state || !rootRef.current) return;
    session.flipState = null;
    const targets = rootRef.current.querySelectorAll(
      '.sortable-media-item:not(.is-sortable-lifted):not(.is-sortable-exiting)'
    );
    gsap.killTweensOf(targets);
    Flip.from(state, {
      targets,
      duration: prefersReducedMotion() ? 0 : FLIP_MS,
      ease: 'power2.out',
      // grid с разными span/размерами — absolute стабильнее; strip — transform в потоке
      absolute: layout === 'grid',
      nested: true,
      scale: false
    });
  }, [dragOrder, layout]);

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
      // ускорение к краю: ease-in quadratic
      speed = -EDGE_MAX_SPEED * (0.2 + 0.8 * t * t);
    } else if (x > rect.right - EDGE_ZONE_PX) {
      const t = 1 - Math.max(0, (rect.right - x) / EDGE_ZONE_PX);
      speed = EDGE_MAX_SPEED * (0.2 + 0.8 * t * t);
    }

    if (speed !== 0) {
      const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
      scrollEl.scrollLeft = Math.max(0, Math.min(maxScroll, scrollEl.scrollLeft + speed));
      const nextDrop = computeDropIndex(
        session.lastClientX,
        session.lastClientY,
        session.orderKeys,
        session.key
      );
      if (nextDrop >= 0) {
        applyLiveOrder(moveKeyToIndex(session.orderKeys, session.key, nextDrop));
      }
    }

    // RAF крутится всё время lift — иначе edge-scroll «через раз» после выхода из зоны
    session.edgeRaf = requestAnimationFrame(tickEdgeScroll);
  }, [applyLiveOrder, computeDropIndex, layout, stopEdgeScroll]);

  const ensureEdgeScroll = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.edgeRaf != null) return;
    session.edgeRaf = requestAnimationFrame(tickEdgeScroll);
  }, [tickEdgeScroll]);

  const endSession = useCallback(
    (/** @type {{ pointerId?: number, currentTarget?: EventTarget | null } | null} */ event) => {
      const session = sessionRef.current;
      if (!session) return;
      clearTimer('longPressTimer');
      stopEdgeScroll();

      const releaseTarget =
        (event?.currentTarget &&
        typeof /** @type {HTMLElement} */ (event.currentTarget).releasePointerCapture ===
          'function'
          ? /** @type {HTMLElement} */ (event.currentTarget)
          : null) ||
        rootRef.current?.querySelector(
          `.sortable-media-item[data-sortable-key="${CSS.escape(session.key)}"]`
        );

      if (releaseTarget) {
        try {
          if (releaseTarget.hasPointerCapture?.(session.pointerId)) {
            releaseTarget.releasePointerCapture(session.pointerId);
          }
        } catch {
          /* ignore */
        }
      }

      const finalKeys = session.orderKeys;
      const originKeys = session.originKeys;
      const changed =
        session.dragging &&
        finalKeys.length === originKeys.length &&
        finalKeys.some((key, i) => key !== originKeys[i]);

      if (changed) {
        const byKey = new Map(itemsRef.current.map((item) => [item.key, item]));
        const nextItems = finalKeys.map((key) => byKey.get(key)).filter(Boolean);
        if (nextItems.length === finalKeys.length) {
          onReorder(nextItems);
        }
      }

      sessionRef.current = null;
      setDragKey(null);
      setLifted(false);
      setDragOrder(null);
      setGhost(null);
    },
    [clearTimer, onReorder, stopEdgeScroll]
  );

  const liftItem = useCallback((clientX, clientY) => {
    const session = sessionRef.current;
    if (!session || !session.dragging || session.lifted) return;
    session.lifted = true;
    setLifted(true);
    const item = itemsRef.current.find((entry) => entry.key === session.key);
    if (!item) return;
    // Компенсация scale: origin center → визуально не «съезжает» вниз-вправо
    const grow = ((GHOST_SCALE - 1) * session.itemW) / 2;
    const growY = ((GHOST_SCALE - 1) * session.itemH) / 2;
    setGhost({
      key: session.key,
      x: clientX - session.grabX - grow,
      y: clientY - session.grabY - growY,
      w: session.itemW,
      h: session.itemH,
      url: item.url,
      isVideo: item.isVideo
    });
    if (layout === 'strip') {
      ensureEdgeScroll();
    }
  }, [ensureEdgeScroll, layout]);

  const startDragging = useCallback(
    (key, el) => {
      const session = sessionRef.current;
      if (!session || session.key !== key) return;
      const keys = activeKeys();
      session.dragging = true;
      session.suppressClick = true;
      session.lifted = false;
      session.orderKeys = keys.slice();
      session.originKeys = keys.slice();
      setDragKey(key);
      setLifted(false);
      setDragOrder(keys.slice());
      try {
        el.setPointerCapture?.(session.pointerId);
      } catch {
        /* ignore */
      }
      // Только armed scale на месте — ghost после движения.
    },
    [activeKeys]
  );

  const onItemPointerDown = useCallback(
    (/** @type {React.PointerEvent<HTMLElement>} */ event, key) => {
      if (event.button != null && event.button !== 0) return;
      const target = /** @type {HTMLElement | null} */ (event.target);
      if (target?.closest?.('.media-remove-btn')) return;

      clearTimer('longPressTimer');
      stopEdgeScroll();

      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      const keys = activeKeys();
      const canSort = enabled && keys.length > 1;

      sessionRef.current = {
        key,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        grabX: event.clientX - rect.left,
        grabY: event.clientY - rect.top,
        itemW: rect.width,
        itemH: rect.height,
        longPressTimer: canSort
          ? setTimeout(() => {
              startDragging(key, el);
            }, LONG_PRESS_MS)
          : null,
        dragging: false,
        lifted: false,
        suppressClick: false,
        orderKeys: keys.slice(),
        originKeys: keys.slice(),
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        edgeRaf: null,
        flipState: null
      };
    },
    [activeKeys, clearTimer, enabled, startDragging, stopEdgeScroll]
  );

  const handlePointerMove = useCallback(
    (/** @type {{ pointerId: number, clientX: number, clientY: number, preventDefault?: () => void }} */ event) => {
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
          sessionRef.current = null;
        }
        return;
      }

      event.preventDefault?.();

      if (!session.lifted) {
        if (dist < LIFT_MOVE_PX) return;
        liftItem(event.clientX, event.clientY);
      }

      const grow = ((GHOST_SCALE - 1) * session.itemW) / 2;
      const growY = ((GHOST_SCALE - 1) * session.itemH) / 2;
      setGhost((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - session.grabX - grow,
              y: event.clientY - session.grabY - growY
            }
          : prev
      );

      const nextDrop = computeDropIndex(
        event.clientX,
        event.clientY,
        session.orderKeys,
        session.key
      );
      if (nextDrop >= 0) {
        applyLiveOrder(moveKeyToIndex(session.orderKeys, session.key, nextDrop));
      }

      if (layout === 'strip') {
        ensureEdgeScroll();
      }
    },
    [
      applyLiveOrder,
      clearTimer,
      computeDropIndex,
      ensureEdgeScroll,
      layout,
      liftItem
    ]
  );

  const onItemPointerMove = useCallback(
    (/** @type {React.PointerEvent} */ event) => {
      handlePointerMove(event);
    },
    [handlePointerMove]
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

  // Window listeners: webview иногда теряет pointermove на элементе после Flip/reorder.
  useLayoutEffect(() => {
    if (!dragKey) return undefined;
    const onMove = (/** @type {PointerEvent} */ event) => {
      handlePointerMove(event);
    };
    const onUp = (/** @type {PointerEvent} */ event) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      endSession(event);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragKey, endSession, handlePointerMove]);

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
    const prevOverflowX = scrollEl?.style.overflowX || '';
    if (scrollEl) {
      scrollEl.style.touchAction = 'none';
      // Жестовый pan-x выключаем; программный edge-scroll через scrollLeft остаётся.
      scrollEl.style.overflowX = 'auto';
    }
    const blockWheel = (/** @type {WheelEvent} */ e) => {
      if (scrollEl?.contains(/** @type {Node} */ (e.target)) || rootRef.current?.contains(/** @type {Node} */ (e.target))) {
        e.preventDefault();
      }
    };
    const blockTouchScroll = (/** @type {TouchEvent} */ e) => {
      if (e.cancelable) e.preventDefault();
    };
    window.addEventListener('wheel', blockWheel, { passive: false, capture: true });
    window.addEventListener('touchmove', blockTouchScroll, { passive: false, capture: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      if (scrollEl) {
        scrollEl.style.touchAction = prevTouchAction;
        scrollEl.style.overflowX = prevOverflowX;
      }
      window.removeEventListener('wheel', blockWheel, true);
      window.removeEventListener('touchmove', blockTouchScroll, true);
    };
  }, [dragKey]);

  // Синхронизация dragOrder при изменении items (прогресс загрузки) во время DnD.
  useEffect(() => {
    const session = sessionRef.current;
    if (!session?.dragging || !dragOrder) return;
    const liveKeys = items.filter((item) => !exitingKeys[item.key]).map((item) => item.key);
    const stillValid =
      dragOrder.length === liveKeys.length && dragOrder.every((key) => liveKeys.includes(key));
    if (!stillValid) {
      const merged = [
        ...dragOrder.filter((key) => liveKeys.includes(key)),
        ...liveKeys.filter((key) => !dragOrder.includes(key))
      ];
      session.orderKeys = merged;
      session.originKeys = session.originKeys.filter((key) => liveKeys.includes(key));
      setDragOrder(merged);
    }
  }, [dragOrder, exitingKeys, items]);

  if (!items.length) return null;

  const canSort = enabled && items.filter((i) => !exitingKeys[i.key]).length > 1;
  const renderItems = displayItems;

  return (
    <div
      ref={rootRef}
      className={clsx(
        'sortable-media-preview',
        layout === 'strip' && 'sortable-media-preview--strip',
        layout === 'grid' && 'sortable-media-preview--grid',
        layout === 'grid' && `telegram-media-grid telegram-media-grid--${Math.min(renderItems.length, 5)}`,
        dragKey && 'sortable-media-preview--dragging',
        dragKey && lifted && 'sortable-media-preview--lifted',
        className
      )}
    >
      {renderItems.map((item, index) => {
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
              isDragging && lifted && 'is-sortable-placeholder',
              isExiting && 'is-sortable-exiting'
            )}
            data-sortable-key={item.key}
            onPointerDown={(e) => onItemPointerDown(e, item.key)}
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
            width: ghost.w,
            height: ghost.h,
            transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0) scale(${GHOST_SCALE})`
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
