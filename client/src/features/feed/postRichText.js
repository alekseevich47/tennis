const FRAME_CLASS = 'post-anim-frame';
const FRAME_PRESETS_KEY = 'tennis.postFramePresets';

const DEFAULT_PRESETS = ['#FF4D6D', '#FF9F0A', '#34C759', '#007AFF', '#AF52DE', '#1C1C1E'];

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR', 'DIV', 'P', 'SPAN']);
const ALLOWED_ATTRS = {
  A: new Set(['href', 'target', 'rel']),
  SPAN: new Set(['class', 'data-color', 'style'])
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
 * @param {string} color
 * @returns {string | null}
 */
export function normalizeHexColor(color) {
  if (!color) return null;
  let value = String(color).trim();
  if (!value.startsWith('#')) value = `#${value}`;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  return value.toUpperCase();
}

/**
 * @returns {string[]}
 */
export function loadFramePresets() {
  try {
    const raw = localStorage.getItem(FRAME_PRESETS_KEY);
    if (!raw) return [...DEFAULT_PRESETS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_PRESETS];
    const cleaned = parsed
      .map((item) => normalizeHexColor(item))
      .filter(Boolean);
    return cleaned.length > 0 ? /** @type {string[]} */ (cleaned) : [...DEFAULT_PRESETS];
  } catch {
    return [...DEFAULT_PRESETS];
  }
}

/**
 * @param {string[]} colors
 */
export function saveFramePresets(colors) {
  const cleaned = colors.map((item) => normalizeHexColor(item)).filter(Boolean);
  localStorage.setItem(FRAME_PRESETS_KEY, JSON.stringify(cleaned));
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
 * @param {Element} el
 * @returns {boolean}
 */
function isAnimFrame(el) {
  return el.tagName === 'SPAN' && el.classList.contains(FRAME_CLASS);
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

  if (tag === 'SPAN' && isAnimFrame(el)) {
    const color = normalizeHexColor(el.getAttribute('data-color') || '') || '#FF4D6D';
    const inner = Array.from(el.childNodes)
      .map((child) => (child.nodeType === Node.TEXT_NODE ? (child.textContent || '') : child.textContent || ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    const text = escapeHtml(inner || 'текст|вариант');
    return `<span class="${FRAME_CLASS}" data-color="${color}" style="--frame-color:${color}">${text}</span>`;
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
      attrs += ' target="_blank" rel="noopener noreferrer';
    }
  }

  const inner = Array.from(el.childNodes).map(serializeSanitized).join('');
  const lower = tag.toLowerCase();
  return `<${lower}${attrs}>${inner}</${lower}>`;
}

/**
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
 * Wrap selection (or insert template) as animated color frame.
 * @param {string} color
 * @param {HTMLElement} editor
 * @returns {boolean}
 */
export function applyAnimFrame(color, editor) {
  const hex = normalizeHexColor(color) || '#FF4D6D';
  const selection = window.getSelection();
  if (!selection) return false;

  editor.focus();

  let range;
  if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
    range = selection.getRangeAt(0);
  } else {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  const selected = range.toString().replace(/\u200B/g, '').trim();
  const text = selected || 'текст|вариант';

  const span = document.createElement('span');
  span.className = FRAME_CLASS;
  span.setAttribute('data-color', hex);
  span.style.setProperty('--frame-color', hex);
  span.textContent = text;

  range.deleteContents();
  range.insertNode(span);

  // caret after frame
  range.setStartAfter(span);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
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

/**
 * Cycle `|`-separated variants inside `.post-anim-frame` nodes.
 * @param {ParentNode | null} root
 * @param {number} [intervalMs]
 * @returns {() => void}
 */
export function startAnimFrames(root, intervalMs = 1600) {
  if (!root) return () => {};
  const nodes = Array.from(root.querySelectorAll(`.${FRAME_CLASS}`));
  if (nodes.length === 0) return () => {};

  /** @type {{ el: HTMLElement, variants: string[], index: number }[]} */
  const items = nodes.map((node) => {
    const el = /** @type {HTMLElement} */ (node);
    const raw = (el.getAttribute('data-variants') || el.textContent || '').trim();
    const variants = raw.split('|').map((part) => part.trim()).filter(Boolean);
    if (!el.getAttribute('data-variants')) {
      el.setAttribute('data-variants', variants.join('|'));
    }
    const color = normalizeHexColor(el.getAttribute('data-color') || '') || '#FF4D6D';
    el.style.setProperty('--frame-color', color);
    el.textContent = variants[0] || '';
    return { el, variants: variants.length > 0 ? variants : [''], index: 0 };
  });

  const multi = items.filter((item) => item.variants.length > 1);
  if (multi.length === 0) return () => {};

  const timer = window.setInterval(() => {
    for (const item of multi) {
      item.index = (item.index + 1) % item.variants.length;
      item.el.classList.remove('is-swap');
      // force reflow for CSS animation restart
      void item.el.offsetWidth;
      item.el.textContent = item.variants[item.index];
      item.el.classList.add('is-swap');
    }
  }, intervalMs);

  return () => window.clearInterval(timer);
}

export { FRAME_CLASS, DEFAULT_PRESETS };
