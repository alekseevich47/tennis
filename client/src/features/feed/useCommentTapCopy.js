// @ts-check
import { useCallback, useRef } from 'react';
import { toPlainText } from './postRichText';

const TAP_MOVE_CANCEL_PX = 10;

/**
 * @param {EventTarget | null} target
 */
function isInteractiveTapTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, [role="button"], .comment-reply-quote, .comment-like-btn, .comment-reply-btn, .comment-bubble__author, .comment-media-grid, .media-preview-grid, .post-mention'
    )
  );
}

/**
 * Одиночный тап/клик по пузырьку — копирование plain-text комментария (все пользователи).
 * @param {{
 *   text?: string,
 *   enabled?: boolean,
 *   onCopied?: () => void
 * }} [options]
 */
export function useCommentTapCopy({ text = '', enabled = true, onCopied } = {}) {
  const startRef = useRef(/** @type {{ x: number, y: number, time: number } | null} */ (null));
  const tapValidRef = useRef(false);
  const suppressRef = useRef(false);

  const suppressNextTap = useCallback(() => {
    suppressRef.current = true;
    tapValidRef.current = false;
    startRef.current = null;
  }, []);

  const onPointerDown = useCallback((/** @type {React.PointerEvent} */ event) => {
    if (!enabled) return;
    if (event.button != null && event.button !== 0) return;
    if (isInteractiveTapTarget(event.target)) return;

    suppressRef.current = false;
    tapValidRef.current = true;
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
  }, [enabled]);

  const onPointerMove = useCallback((/** @type {React.PointerEvent} */ event) => {
    const start = startRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_CANCEL_PX) {
      tapValidRef.current = false;
      startRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    startRef.current = null;
  }, []);

  const onPointerCancel = useCallback(() => {
    tapValidRef.current = false;
    startRef.current = null;
  }, []);

  const onClick = useCallback(async (/** @type {React.MouseEvent} */ event) => {
    if (suppressRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressRef.current = false;
      tapValidRef.current = false;
      return;
    }

    if (!enabled || !tapValidRef.current) return;
    tapValidRef.current = false;
    if (isInteractiveTapTarget(event.target)) return;

    const plain = toPlainText(text);
    if (!plain) return;

    try {
      await navigator.clipboard.writeText(plain);
      onCopied?.();
    } catch {
      /* clipboard может быть недоступен */
    }
  }, [enabled, onCopied, text]);

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClick
    },
    suppressNextTap
  };
}
