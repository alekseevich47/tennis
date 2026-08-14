/** Длительность схлапывания Modal к origin (синхрон с Modal.css / useKeepForModalClose). */
export const MODAL_CLOSE_MS = 200;

/** @typedef {{ left: number, top: number, width: number, height: number }} OriginRect */

/** @type {OriginRect | null} */
let lastPointerOrigin = null;

const ORIGIN_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[data-modal-origin]',
  'article',
  '.post-card',
  '.training-row-card',
  '.product-card',
  '.player-row',
  '.comment-author-profile-link',
  '.training-player-profile-link',
  '.gallery-comment-item__header',
  '.gallery-item',
  '.gallery-grid-item'
].join(', ');

/**
 * @param {Element | null | undefined} el
 * @returns {OriginRect | null}
 */
export function snapshotOriginRect(el) {
  if (!el || el === document.body || el === document.documentElement) return null;
  if (typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height
  };
}

/**
 * @param {EventTarget | null} target
 * @returns {OriginRect | null}
 */
export function originRectFromTarget(target) {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest(ORIGIN_SELECTOR) || target;
  return snapshotOriginRect(anchor);
}

function onPointerDown(event) {
  const rect = originRectFromTarget(event.target);
  if (rect) lastPointerOrigin = rect;
}

let listening = false;

/** Подписка один раз на document (capture) — origin клика до открытия модалки. */
export function ensureModalOriginTracking() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('pointerdown', onPointerDown, true);
}

/** @returns {OriginRect | null} */
export function getLastPointerOrigin() {
  return lastPointerOrigin;
}

/**
 * Точка схлапывания: центр origin относительно центра модалки.
 * @param {HTMLElement | null} contentEl
 * @param {OriginRect | null | undefined} origin
 * @returns {string}
 */
export function getModalCollapseTransform(contentEl, origin) {
  if (!contentEl) return 'scale(0.92)';
  if (!origin) return 'scale(0.85)';

  const modalRect = contentEl.getBoundingClientRect();
  if (modalRect.width < 2 || modalRect.height < 2) return 'scale(0.85)';

  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;
  const mx = modalRect.left + modalRect.width / 2;
  const my = modalRect.top + modalRect.height / 2;
  const dx = ox - mx;
  const dy = oy - my;
  const scale = Math.max(
    0.06,
    Math.min(origin.width / modalRect.width, origin.height / modalRect.height, 0.18)
  );
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}
