/**
 * Скролл-контейнер (обычно `.ui-modal-body`) для inline-редактирования комментария.
 * @param {Element | null | undefined} node
 * @returns {HTMLElement | null}
 */
export function findScrollParent(node) {
  let el = node?.parentElement || null;
  while (el) {
    const overflowY = window.getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * Держит форму редактирования в видимой области scroll-parent с учётом
 * sticky footer модалки и visualViewport (клавиатура в mobile webview).
 * Не использует scrollIntoView(block:'start') — иначе поле «улетает» вверх.
 *
 * @param {Element | null | undefined} el
 * @param {{ padding?: number }} [opts]
 */
export function keepCommentEditInView(el, { padding = 12 } = {}) {
  if (!el || !(el instanceof Element)) return;
  const scrollParent = findScrollParent(el);
  if (!scrollParent) return;

  const elRect = el.getBoundingClientRect();
  const parentRect = scrollParent.getBoundingClientRect();
  const vv = window.visualViewport;
  const viewportTop = vv ? vv.offsetTop : 0;
  const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;

  const modal = el.closest('.ui-modal-content');
  const footer = modal?.querySelector('.ui-modal-footer');
  const footerTop = footer ? footer.getBoundingClientRect().top : viewportBottom;

  const visibleTop = Math.max(parentRect.top, viewportTop) + padding;
  const visibleBottom = Math.min(parentRect.bottom, viewportBottom, footerTop) - padding;
  if (visibleBottom <= visibleTop) return;

  if (elRect.bottom > visibleBottom) {
    scrollParent.scrollTop += elRect.bottom - visibleBottom;
  } else if (elRect.top < visibleTop) {
    scrollParent.scrollTop -= visibleTop - elRect.top;
  }
}

/**
 * После нативного focus (тап) webview часто скроллит поле к верху контейнера.
 * Восстанавливаем scrollTop до фокуса, затем аккуратно подгоняем под клавиатуру.
 *
 * @param {Element | null | undefined} el
 * @param {number | null | undefined} scrollTopBefore
 */
export function restoreAndKeepCommentEditInView(el, scrollTopBefore) {
  const scrollParent = findScrollParent(el);
  if (scrollParent && scrollTopBefore != null && Math.abs(scrollParent.scrollTop - scrollTopBefore) > 40) {
    scrollParent.scrollTop = scrollTopBefore;
  }
  keepCommentEditInView(el);
  requestAnimationFrame(() => keepCommentEditInView(el));
  window.setTimeout(() => keepCommentEditInView(el), 120);
  window.setTimeout(() => keepCommentEditInView(el), 320);
}
