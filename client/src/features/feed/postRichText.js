const FRAME_CLASS = 'post-anim-frame';
const FRAME_PRESETS_KEY = 'tennis.postFramePresets';

const DEFAULT_PRESETS = ['#FF4D6D', '#FF9F0A', '#34C759', '#007AFF', '#AF52DE', '#1C1C1E'];

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR', 'DIV', 'P', 'SPAN']);
const ALLOWED_ATTRS = {
  A: new Set(['href', 'target', 'rel']),
  SPAN: new Set(['class', 'data-color', 'data-variants', 'style'])
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
    const fromAttr = (el.getAttribute('data-variants') || '').trim();
    const fromText = (el.textContent || '').replace(/\s+/g, ' ').trim();
    // Prefer live text from editor (user may edit variants via `|`).
    const raw = (fromText.includes('|') ? fromText : fromAttr || fromText) || 'текст|вариант';
    const variants = raw
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('|') || 'текст|вариант';
    return (
      `<span class="${FRAME_CLASS}" data-color="${color}" data-variants="${escapeHtml(variants)}" ` +
      `style="--frame-color:${color}">` +
      `<span class="post-anim-frame__text">${escapeHtml(variants)}</span>` +
      `</span>`
    );
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
 * Первая визуальная строка HTML поста для плашки закрепа.
 * Обрезает по первому `<br>` или блоковому разрыву (`p`/`div`),
 * сохраняя inline-разметку и `.post-anim-frame`.
 * @param {string} html
 * @returns {string}
 */
export function getFirstLine(html) {
  const display = toDisplayHtml(html || '');
  if (!display) return '';

  const doc = new DOMParser().parseFromString(
    `<div id="__first_line_root">${display}</div>`,
    'text/html'
  );
  const root = doc.getElementById('__first_line_root');
  if (!root) return '';

  /**
   * @param {ParentNode} parent
   * @param {HTMLElement} out
   * @returns {boolean} true — дальше не читать (разрыв строки)
   */
  function collect(parent, out) {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out.appendChild(doc.createTextNode(child.textContent || ''));
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = /** @type {Element} */ (child);
      const tag = el.tagName.toUpperCase();

      if (tag === 'BR') return true;

      if (tag === 'P' || tag === 'DIV') {
        if (out.childNodes.length > 0) return true;
        collect(el, out);
        return true;
      }

      out.appendChild(el.cloneNode(true));
    }
    return false;
  }

  const out = doc.createElement('div');
  collect(root, out);
  const result = sanitizePostHtml(out.innerHTML);
  // Plain-only строка уже entity-escaped; оборачиваем, чтобы повторный
  // toDisplayHtml в PostContentHtml не экранировал `&lt;` ещё раз.
  if (result && !looksLikeRichHtml(result)) {
    return `<span>${result}</span>`;
  }
  return result;
}

/**
 * @param {'bold' | 'italic' | 'underline'} command
 */
export function applyFormatCommand(command) {
  if (command === 'bold') document.execCommand('bold');
  else if (command === 'italic') document.execCommand('italic');
  else if (command === 'underline') document.execCommand('underline');
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

  const selected = range.toString().replace(/[\u200B\u00A0]/g, '').trim();
  const text = selected || 'текст|вариант';

  const span = document.createElement('span');
  span.className = FRAME_CLASS;
  span.setAttribute('data-color', hex);
  span.setAttribute('data-variants', text);
  span.style.setProperty('--frame-color', hex);

  const label = document.createElement('span');
  label.className = 'post-anim-frame__text';
  label.textContent = text;
  span.appendChild(label);

  range.deleteContents();
  range.insertNode(span);

  const spacer = document.createTextNode('\u00A0');
  if (span.nextSibling) {
    span.parentNode?.insertBefore(spacer, span.nextSibling);
  } else {
    span.parentNode?.appendChild(spacer);
  }

  range.setStart(spacer, 1);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

/**
 * Ensure each frame chip has a text node after it so the caret can sit outside.
 * @param {HTMLElement | null} editor
 */
export function ensureFrameCarets(editor) {
  if (!editor) return;
  editor.querySelectorAll(`.${FRAME_CLASS}`).forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    const next = el.nextSibling;
    const hasSpacer =
      next &&
      next.nodeType === Node.TEXT_NODE &&
      /[\u00A0\u200B\s]/.test(next.textContent || '');
    if (!hasSpacer) {
      el.after(document.createTextNode('\u00A0'));
    }
  });
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
 * Lock `.post-anim-frame` width to the widest `|`-variant so the chip
 * does not jump when cycling text. Applied on display only (not in editor).
 * @param {HTMLElement} el
 * @param {HTMLElement} textEl
 * @param {string[]} variants
 */
function lockAnimFrameWidth(el, textEl, variants) {
  const style = window.getComputedStyle(textEl);
  const probe = document.createElement('span');
  probe.style.cssText = [
    'position:absolute',
    'visibility:hidden',
    'pointer-events:none',
    'white-space:nowrap',
    'left:-9999px',
    'top:0',
    `font:${style.font}`,
    `letter-spacing:${style.letterSpacing}`,
    `text-transform:${style.textTransform}`,
    'padding:0',
    'margin:0',
    'border:0'
  ].join(';');
  document.body.appendChild(probe);

  let max = 0;
  for (const variant of variants) {
    probe.textContent = variant;
    max = Math.max(max, probe.offsetWidth);
  }
  probe.remove();

  const frameStyle = window.getComputedStyle(el);
  const padX =
    (parseFloat(frameStyle.paddingLeft) || 0) +
    (parseFloat(frameStyle.paddingRight) || 0);
  el.style.width = `${Math.ceil(max + padX)}px`;
}

/**
 * Cycle `|`-separated variants inside `.post-anim-frame` nodes.
 * Animates only the inner text; the colored frame stays still.
 * @param {ParentNode | null} root
 * @param {number} [intervalMs]
 * @returns {() => void}
 */
export function startAnimFrames(root, intervalMs = 1600) {
  if (!root) return () => {};
  const nodes = Array.from(root.querySelectorAll(`.${FRAME_CLASS}`));
  if (nodes.length === 0) return () => {};

  /** @type {{ el: HTMLElement, textEl: HTMLElement, variants: string[], index: number, busy: boolean }[]} */
  const items = nodes.map((node) => {
    const el = /** @type {HTMLElement} */ (node);
    const raw = (el.getAttribute('data-variants') || el.textContent || '').trim();
    const variants = raw.split('|').map((part) => part.trim()).filter(Boolean);
    const list = variants.length > 0 ? variants : [''];
    el.setAttribute('data-variants', list.join('|'));

    const color = normalizeHexColor(el.getAttribute('data-color') || '') || '#FF4D6D';
    el.style.setProperty('--frame-color', color);

    let textEl = /** @type {HTMLElement | null} */ (el.querySelector('.post-anim-frame__text'));
    if (!textEl) {
      textEl = document.createElement('span');
      textEl.className = 'post-anim-frame__text';
      el.textContent = '';
      el.appendChild(textEl);
    }
    textEl.textContent = list[0] || '';
    return { el, textEl, variants: list, index: 0, busy: false };
  });

  for (const item of items) {
    lockAnimFrameWidth(item.el, item.textEl, item.variants);
  }

  const multi = items.filter((item) => item.variants.length > 1);
  if (multi.length === 0) return () => {};

  /** @type {number[]} */
  const timeouts = [];

  const timer = window.setInterval(() => {
    for (const item of multi) {
      if (item.busy) continue;
      item.busy = true;
      item.index = (item.index + 1) % item.variants.length;
      const next = item.variants[item.index];

      item.textEl.classList.remove('is-enter');
      item.textEl.classList.add('is-exit');

      const t = window.setTimeout(() => {
        item.textEl.textContent = next;
        item.textEl.classList.remove('is-exit');
        item.textEl.classList.add('is-enter');
        item.busy = false;
      }, 220);
      timeouts.push(t);
    }
  }, intervalMs);

  return () => {
    window.clearInterval(timer);
    timeouts.forEach((id) => window.clearTimeout(id));
  };
}

export { FRAME_CLASS, DEFAULT_PRESETS };
