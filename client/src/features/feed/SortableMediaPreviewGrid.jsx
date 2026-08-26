import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { videoPreviewUrl } from '../../lib/media';
import MediaProgressRing from './MediaProgressRing';

gsap.registerPlugin(Flip);

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 10;
const LIFT_MOVE_PX = 6;
const EDGE_ZONE_PX = 56;
const EDGE_MAX_SPEED = 22;
const REMOVE_MS = 280;
/** Медленнее раздвижение соседей при примерке слота */
const FLIP_MS = 0.42;
/** Доля ширины «чужого» слота: левее — вставить до, правее — после (~шире зоны) */
const STRIP_SWITCH_RATIO = 0.38;
/** Гистерезис против дребезга на границе слотов */
const DROP_HYSTERESIS_PX = 22;
/** Расширение hit-box сетки (px) */
const GRID_HIT_PAD = 18;

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
 * Индекс вставки среди «чужих» слотов (без placeholder) — стабилен для 2 элементов и конца ленты.
 * @param {number} clientX
 * @param {string[]} orderKeys
 * @param {string} activeKey
 * @param {(key: string) => DOMRect | null} getRect
 * @param {number} currentIndex
 */
function computeStripDropIndex(clientX, orderKeys, activeKey, getRect, currentIndex) {
  /** @type {{ key: string, mid: number, left: number, right: number }[]} */
  const others = [];
  for (const key of orderKeys) {
    if (key === activeKey) continue;
    const rect = getRect(key);
    if (!rect) continue;
    others.push({
      key,
      mid: rect.left + rect.width * STRIP_SWITCH_RATIO,
      left: rect.left,
      right: rect.right
    });
  }

  let insertAmong = others.length;
  for (let j = 0; j < others.length; j += 1) {
    if (clientX < others[j].mid) {
      insertAmong = j;
      break;
    }
  }

  const without = others.map((o) => o.key);
  without.splice(insertAmong, 0, activeKey);
  let nextIndex = without.indexOf(activeKey);

  if (nextIndex === currentIndex) return currentIndex;

  // Гистерезис: смена только если ушли за порог + DROP_HYSTERESIS_PX
  if (nextIndex > currentIndex) {
    const gateIdx = insertAmong - 1;
    const gate = gateIdx >= 0 ? others[gateIdx] : null;
    if (gate && clientX < gate.mid + DROP_HYSTERESIS_PX) {
      return currentIndex;
    }
  } else if (nextIndex < currentIndex) {
    const gate = others[insertAmong];
    if (gate && clientX > gate.mid - DROP_HYSTERESIS_PX) {
      return currentIndex;
    }
  }

  return nextIndex;
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {string[]} orderKeys
 * @param {string} activeKey
 * @param {(key: string) => DOMRect | null} getRect
 * @param {number} currentIndex
 */
function computeGridDropIndex(clientX, clientY, orderKeys, activeKey, getRect, currentIndex) {
  let best = currentIndex;
  let bestDist = Infinity;

  for (let i = 0; i < orderKeys.length; i += 1) {
    const key = orderKeys[i];
    if (key === activeKey) continue;
    const rect = getRect(key);
    if (!rect) continue;
    const pad = GRID_HIT_PAD;
    const inPad =
      clientX >= rect.left - pad &&
      clientX <= rect.right + pad &&
      clientY >= rect.top - pad &&
      clientY <= rect.bottom + pad;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    const score = inPad ? dist * 0.55 : dist;
    if (score < bestDist) {
      bestDist = score;
      best = i;
    }
  }

  if (best === currentIndex) return currentIndex;

  const targetRect = getRect(orderKeys[best]);
  if (!targetRect) return currentIndex;
  const cx = targetRect.left + targetRect.width / 2;
  const cy = targetRect.top + targetRect.height / 2;
  if (Math.hypot(clientX - cx, clientY - cy) > Math.min(targetRect.width, targetRect.height) * 0.72) {
    return currentIndex;
  }
  return best;
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
     *   liftClientX: number,
     *   liftClientY: number,
     *   ghostOriginX: number,
     *   ghostOriginY: number,
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

  const getItemRect = useCallback((key) => {
    const root = rootRef.current;
    if (!root) return null;
    const node = root.querySelector(`.sortable-media-item[data-sortable-key="${CSS.escape(key)}"]`);
    return node ? /** @type {HTMLElement} */ (node).getBoundingClientRect() : null;
  }, []);

  const computeDropIndex = useCallback(
    (clientX, clientY, orderKeys, activeKey) => {
      const currentIndex = orderKeys.indexOf(activeKey);
      if (currentIndex < 0 || orderKeys.length < 2) return currentIndex;

      if (layout === 'strip') {
        return computeStripDropIndex(clientX, orderKeys, activeKey, getItemRect, currentIndex);
      }
      return computeGridDropIndex(clientX, clientY, orderKeys, activeKey, getItemRect, currentIndex);
    },
    [getItemRect, layout]
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
      if (prev.length === nextKeys.length && prev.every((key, i) => key === nextKeys[i])) {
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
      ease: 'power3.out',
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

  const liftItem = useCallback(
    (clientX, clientY) => {
      const session = sessionRef.current;
      if (!session || !session.dragging || session.lifted) return;
      const item = itemsRef.current.find((entry) => entry.key === session.key);
      if (!item) return;

      // Визуальный rect armed (уже со scale) — ghost стартует точно отсюда, без отскока.
      const visual = getItemRect(session.key);
      const originX = visual?.left ?? clientX - session.grabX;
      const originY = visual?.top ?? clientY - session.grabY;
      const w = visual?.width ?? session.itemW;
      const h = visual?.height ?? session.itemH;

      session.lifted = true;
      session.liftClientX = clientX;
      session.liftClientY = clientY;
      session.ghostOriginX = originX;
      session.ghostOriginY = originY;
      setLifted(true);
      setGhost({
        key: session.key,
        x: originX,
        y: originY,
        w,
        h,
        url: item.url,
        isVideo: item.isVideo
      });
      if (layout === 'strip') {
        ensureEdgeScroll();
      }
    },
    [ensureEdgeScroll, getItemRect, layout]
  );

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
        liftClientX: event.clientX,
        liftClientY: event.clientY,
        ghostOriginX: rect.left,
        ghostOriginY: rect.top,
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
        return;
      }

      // Следование пальцу от точки lift — без пересчёта grab (нет скачка вниз-вправо)
      const x = session.ghostOriginX + (event.clientX - session.liftClientX);
      const y = session.ghostOriginY + (event.clientY - session.liftClientY);
      setGhost((prev) => (prev ? { ...prev, x, y } : prev));

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
      scrollEl.style.overflowX = 'auto';
    }
    const blockWheel = (/** @type {WheelEvent} */ e) => {
      if (
        scrollEl?.contains(/** @type {Node} */ (e.target)) ||
        rootRef.current?.contains(/** @type {Node} */ (e.target))
      ) {
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
            transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)`
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
