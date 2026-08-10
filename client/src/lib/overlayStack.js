// @ts-check

/**
 * LIFO-стек закрываемых оверлеев (Modal, fullscreen, дропдауны, меню).
 * Системная «Назад» закрывает верхний слой через `closeTopOverlay()`.
 */

/**
 * @typedef {{ id: string, close: () => void }} OverlayEntry
 */

/** @type {OverlayEntry[]} */
const stack = [];

/**
 * @param {string} id
 * @param {() => void} close
 * @returns {() => void} unregister
 */
export function registerOverlay(id, close) {
  // Повторная регистрация того же id — поднимаем наверх
  const idx = stack.findIndex((entry) => entry.id === id);
  if (idx >= 0) stack.splice(idx, 1);
  stack.push({ id, close });
  return () => {
    const i = stack.findIndex((entry) => entry.id === id);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** @returns {boolean} true — закрыли слой */
export function closeTopOverlay() {
  const top = stack[stack.length - 1];
  if (!top) return false;
  try {
    top.close();
  } catch {
    // ignore
  }
  return true;
}

/** @returns {boolean} */
export function hasOpenOverlay() {
  return stack.length > 0;
}

/** @returns {number} */
export function getOverlayDepth() {
  return stack.length;
}
