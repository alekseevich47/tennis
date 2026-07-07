// @ts-check
// Изолированная математика жестов (pinch-zoom + swipe-to-close).

export const SWIPE_CLOSE_THRESHOLD = 120;
export const OPACITY_DISTANCE = 400;
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const INERTIA_FRICTION = 0.94;
export const INERTIA_FRAME_MS = 16;
export const INERTIA_STOP_VELOCITY = 0.01;

/**
 * Дистанция между двумя touch-точками.
 * @param {Touch} t1
 * @param {Touch} t2
 */
export function getTouchDistance(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Допустимое смещение по осям для зумнутого медиа (object-fit: contain).
 * @param {number} scale
 * @param {number} mediaWidth — ширина медиа при scale=1 (без transform)
 * @param {number} mediaHeight
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 */
export function maxPanLimits(scale, mediaWidth, mediaHeight, viewportWidth, viewportHeight) {
  const scaledW = mediaWidth * scale;
  const scaledH = mediaHeight * scale;
  return {
    limitX: Math.max(0, (scaledW - viewportWidth) / 2),
    limitY: Math.max(0, (scaledH - viewportHeight) / 2)
  };
}

/** @deprecated Используйте maxPanLimits; оставлено для обратной совместимости. */
export function maxPan(scale) {
  const limit = (scale - 1) * 200;
  return limit;
}

/**
 * Расчёт прозрачности фона при свайпе вниз/вверх.
 * @param {number} dragY
 */
export function backdropOpacityForDrag(dragY) {
  return Math.max(1 - Math.abs(dragY) / OPACITY_DISTANCE, 0.2);
}
