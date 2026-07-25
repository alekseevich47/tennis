const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR', 'DIV', 'P', 'SPAN']);
const ALLOWED_ATTRS = {
  A: new Set(['href', 'target', 'rel'])
};

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} html
 * @returns {boolean}
 */
export function looksLikeRichHtml(html) {
  return /<(?:b|strong|i|em|u|a|br|div|p|span)\b/i.test(html || '');
}

/**
 * @param {string} html
 * @returns {boolean}
 */
export function hasVisibleText(html) {
  if (!html) return false;
  if (!looksLikeRichHtml(html)) return html.trim().length > 0;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\u200B/g, '').trim().length > 0;
}

/**
 * @param {HTMLElement | null} el
 * @returns {boolean}
 */
export function isEditorEmpty(el) {
  if (!el) return true;
  const text = (el.textContent || '').replace(/\u200B/g, '').trim();
  return text.length === 0;
}

/**
 * @param {HTMLElement | null} el
 * @returns {string}
 */
export function getEditorHtml(el) {
  if (!el || isEditorEmpty(el)) return '';
  return sanitizePostHtml(el.innerHTML);
}

/**
 * Whitelist-sanitize HTML for post body (test rich-text).
 * @param {string} html
 * @returns {string}
 */
export function sanitizePostHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div id="__rtf_root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__rtf_root');
  if (!root) return '';
  return Array.from(root.childNodes).map(serializeSanitized).join('');
}

/**
 * @param {Node} node
 * @returns {string}
 */
function serializeSanitized(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = /** @type {Element} */ (node);
  const tag = el.tagName.toUpperCase();

  if (tag === 'BR') return '<br>';

  if (!ALLOWED_TAGS.has(tag)) {
    return Array.from(el.childNodes).map(serializeSanitized).join('');
  }

  if (tag === 'SPAN' || tag === 'DIV' || tag === 'P') {
    const inner = Array.from(el.childNodes).map(serializeSanitized).join('');
    if (tag === 'P' || tag === 'DIV') return inner ? `${inner}<br>` : '';
    return inner;
  }

  const allowed = ALLOWED_ATTRS[tag];
  let attrs = '';
  if (allowed) {
    for (const attr of allowed) {
      let value = el.getAttribute(attr);
      if (!value) continue;
      if (attr === 'href') {
        const trimmed = value.trim();
        if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) continue;
        value = trimmed;
      }
      if (attr === 'target') value = '_blank';
      if (attr === 'rel') value = 'noopener noreferrer';
      attrs += ` ${attr}="${escapeHtml(value)}"`;
    }
    if (tag === 'A' && !attrs.includes('href=')) {
      return Array.from(el.childNodes).map(serializeSanitized).join('');
    }
    if (tag === 'A' && !attrs.includes('target=')) {
      attrs += ' target="_blank" rel="noopener noreferrer"';
    }
  }

  const inner = Array.from(el.childNodes).map(serializeSanitized).join('');
  const lower = tag.toLowerCase();
  return `<${lower}${attrs}>${inner}</${lower}>`;
}

/**
 * Safe HTML for feed display (plain text stays escaped).
 * @param {string} content
 * @returns {string}
 */
export function toDisplayHtml(content) {
  if (!content) return '';
  if (looksLikeRichHtml(content)) return sanitizePostHtml(content);
  return escapeHtml(content).replace(/\n/g, '<br>');
}

/**
 * @param {'bold' | 'italic' | 'underline' | 'link'} command
 * @param {string} [value]
 */
export function applyFormatCommand(command, value) {
  if (command === 'bold') document.execCommand('bold');
  else if (command === 'italic') document.execCommand('italic');
  else if (command === 'underline') document.execCommand('underline');
  else if (command === 'link') {
    const url = (value || '').trim();
    if (!url) {
      document.execCommand('unlink');
      return;
    }
    const href = /^https?:\/\//i.test(url) || /^mailto:/i.test(url) ? url : `https://${url}`;
    document.execCommand('createLink', false, href);
  }
}

/**
 * @returns {{ bold: boolean, italic: boolean, underline: boolean }}
 */
export function readActiveFormats() {
  try {
    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    };
  } catch {
    return { bold: false, italic: false, underline: false };
  }
}
