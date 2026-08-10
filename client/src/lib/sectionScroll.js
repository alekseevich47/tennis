// @ts-check

/**
 * Активный скролл-контейнер текущего раздела (лента / запись / магазин / турнир-лента).
 * Используется системной «Назад» для scroll-to-top.
 */

/** @type {HTMLElement | null} */
let activeScrollEl = null;

/**
 * @param {HTMLElement | null} el
 * @returns {() => void}
 */
export function setSectionScrollElement(el) {
  activeScrollEl = el;
  return () => {
    if (activeScrollEl === el) activeScrollEl = null;
  };
}

/** @returns {HTMLElement | null} */
export function getSectionScrollElement() {
  return activeScrollEl;
}

const TOP_EPS = 8;

/** @returns {boolean} */
export function isSectionScrollAtTop() {
  const el = activeScrollEl;
  if (!el) return true;
  return el.scrollTop <= TOP_EPS;
}

/** Плавный возврат к верху активного раздела. */
export function scrollSectionToTop() {
  const el = activeScrollEl;
  if (!el) return;
  if (typeof el.scrollTo === 'function') {
    el.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    el.scrollTop = 0;
  }
}
