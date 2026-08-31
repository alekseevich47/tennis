// @ts-check
import { useCallback, useRef } from 'react';
import { toPlainText } from './postRichText';

const TAP_MOVE_CANCEL_PX = 10;
const TAP_MAX_DURATION_MS = 400;

/**
 * @param {EventTarget | null} target
 */
function isInteractiveTapTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, [role="button"], .comment-reply-quote, .comment-like-btn, .comment-reply-btn, .comment-media-grid, .media-preview-grid, .post-mention'
    )
  );
}

/**
 * Одиночный тап по пузырьку — копирование plain-text комментария.
 * @param {{
 *   text?: string,
 *   enabled?: boolean,
 *   onCopied?: () => void
 * }} [options]
 */
export function useCommentTapCopy({ text = '', enabled = true, onCopied } = {}) {
  const startRef = useRef(/** @type {{ x: number, y: number, time: number } | null} */ (null));
  const suppressRef = useRef(false);

  const suppressNextTap = useCallback(() => {
    suppressRef.current = true;
    startRef.current = null;
  }, []);

  const onPointerDown = useCallback((/** @type {React.PointerEvent} */ event) => {
    if (!enabled) return;
    if (event.button != null && event.button !== 0) return;
    if (isInteractiveTapTarget(event.target)) return;

    suppressRef.current = false;
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
      startRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback(async (/** @type {React.PointerEvent} */ event) => {
    const start = startRef.current;
    startRef.current = null;
    if (!enabled || !start || suppressRef.current) return;
    if (isInteractiveTapTarget(event.target)) return;

    const elapsed = performance.now() - start.time;
    if (elapsed > TAP_MAX_DURATION_MS) return;

    const plain = toPlainText(text);
    if (!plain) return;

    try {
      await navigator.clipboard.writeText(plain);
      onCopied?.();
    } catch {
      /* clipboard может быть недоступен */
    }
  }, [enabled, onCopied, text]);

  const onPointerCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  const onClick = useCallback((/** @type {React.MouseEvent} */ event) => {
    if (!suppressRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressRef.current = false;
  }, []);

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
