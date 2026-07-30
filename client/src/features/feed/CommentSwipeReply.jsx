import React, { useCallback, useRef, useState } from 'react';

const SPRING_MS = 220;
const DRAG_DEADZONE = 8;

/**
 * Свайп справа налево → выбор комментария для ответа.
 * Макс. сдвиг = 1/3 ширины; фиксация при отпускании с |offset| ≥ 1/2 от макс. сдвига (только влево).
 * @param {{
 *   enabled?: boolean,
 *   onReply: () => void,
 *   className?: string,
 *   children: React.ReactNode,
 *   innerRef?: (node: HTMLElement | null) => void
 * }} props
 */
function CommentSwipeReply({ enabled = true, onReply, className = '', children, innerRef }) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const contentRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const actionRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const gestureRef = useRef(/** @type {null | {
    startX: number,
    startY: number,
    offsetX: number,
    isVertical: boolean,
    active: boolean,
    maxSlide: number
  }} */ (null));
  const settlingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const setRootNode = useCallback(
    (node) => {
      rootRef.current = node;
      innerRef?.(node);
    },
    [innerRef]
  );

  const applySlide = useCallback((x, opacity, withTransition) => {
    const content = contentRef.current;
    const action = actionRef.current;
    const transition = withTransition
      ? `transform ${SPRING_MS}ms ease, opacity ${SPRING_MS}ms ease`
      : 'none';
    if (content) {
      content.style.transition = withTransition ? `transform ${SPRING_MS}ms ease` : 'none';
      content.style.transform = `translate3d(${x}px,0,0)`;
    }
    if (action) {
      action.style.transition = transition;
      action.style.opacity = String(opacity);
    }
  }, []);

  const resetSlide = useCallback(
    (withTransition) => {
      applySlide(0, 0, withTransition);
      setDragging(false);
      settlingRef.current = false;
    },
    [applySlide]
  );

  const commitReply = useCallback(
    (maxSlide) => {
      settlingRef.current = true;
      setDragging(false);
      // Сразу в цепочке touchend — иначе mobile webview не даёт focus/клавиатуру после setTimeout.
      onReply();
      applySlide(-maxSlide, 1, true);
      window.setTimeout(() => {
        resetSlide(true);
      }, SPRING_MS);
    },
    [applySlide, onReply, resetSlide]
  );

  const handleTouchStart = (event) => {
    if (!enabled || settlingRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    const width = rootRef.current?.offsetWidth || 0;
    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: 0,
      isVertical: false,
      active: false,
      maxSlide: Math.max(48, width / 3)
    };
  };

  const handleTouchMove = (event) => {
    const gesture = gestureRef.current;
    const touch = event.touches[0];
    if (!gesture || !touch || !enabled || settlingRef.current) return;

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;

    if (!gesture.active) {
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        gesture.isVertical = true;
        return;
      }
      if (Math.abs(deltaX) < DRAG_DEADZONE) return;
      // Только свайп влево
      if (deltaX > 0) {
        gesture.isVertical = true;
        return;
      }
      gesture.active = true;
      setDragging(true);
    }

    if (gesture.isVertical) return;

    // Только позиция при отпускании важна — храним текущий clamp влево (0 … -maxSlide)
    const clamped = Math.max(-gesture.maxSlide, Math.min(0, deltaX));
    gesture.offsetX = clamped;
    const progress = Math.min(1, Math.abs(clamped) / gesture.maxSlide);
    applySlide(clamped, progress, false);
  };

  const handleTouchEnd = (event) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || settlingRef.current) return;

    if (gesture.isVertical || !gesture.active) {
      setDragging(false);
      return;
    }

    // Финальная точка пальца (не пик свайпа)
    const touch = event.changedTouches?.[0];
    let offsetX = gesture.offsetX;
    if (touch) {
      offsetX = Math.max(-gesture.maxSlide, Math.min(0, touch.clientX - gesture.startX));
    }

    const threshold = gesture.maxSlide / 2;
    // Срабатывает только если отпустили, удерживая сдвиг влево ≥ порога
    if (offsetX <= -threshold) {
      commitReply(gesture.maxSlide);
      return;
    }

    resetSlide(true);
  };

  const rootClass = [
    'comment-swipe',
    className,
    dragging ? 'comment-swipe--dragging' : '',
    enabled ? '' : 'comment-swipe--disabled'
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setRootNode}
      className={rootClass}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div ref={actionRef} className="comment-swipe__action" aria-hidden="true">
        <span className="comment-swipe__action-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17l-5-5 5-5" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
        </span>
      </div>
      <div ref={contentRef} className="comment-swipe__content">
        {children}
      </div>
    </div>
  );
}

export default CommentSwipeReply;
