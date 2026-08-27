// @ts-check

/**
 * Plain-text из DOM-выделения: из mention/post-чипов только label-текст, без иконок/медиа.
 * @param {Range} range
 * @returns {string}
 */
export function plainTextFromRange(range) {
  if (!range) return '';
  const frag = range.cloneContents();
  const walker = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  /** @type {string[]} */
  const parts = [];
  /** @type {Node | null} */
  let node = walker.currentNode;
  // TreeWalker starts at root; advance to first child-ish via nextNode
  node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent?.closest?.('.post-mention__doc-icon, .post-mention__remove, .mention-remove')) {
        node = walker.nextNode();
        continue;
      }
      parts.push(node.textContent || '');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = /** @type {Element} */ (node);
      if (el.matches('br')) {
        parts.push('\n');
      }
    }
    node = walker.nextNode();
  }
  return parts.join('').replace(/\u200B/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * @param {ClipboardEvent} event
 * @param {ParentNode | null | undefined} root
 */
export function handleContentCopy(event, root) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (root && !root.contains(range.commonAncestorContainer)) return;
  const text = plainTextFromRange(range);
  if (!text) return;
  event.preventDefault();
  event.clipboardData?.setData('text/plain', text);
}
