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

/** Сущности, которые пишет `escapeHtml` / sanitize (без тегов → иначе двойной escape в UI). */
const ESCAPED_ENTITY_RE = /&(?:amp|lt|gt|quot);/i;

/**
 * @param {string} html
 * @returns {boolean}
 */
export function looksLikeRichHtml(html) {
  return /<(?:b|strong|i|em|u|a|br|div|p|span)\b/i.test(html || '');
}

/**
 * Plain после sanitize без тегов: `hello &quot;x&quot;` — уже безопасный HTML-фрагмент.
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeEscapedPlain(value) {
  return ESCAPED_ENTITY_RE.test(value || '');
}

/**
 * @param {string} html
 * @returns {boolean}
 */
export function hasVisibleText(html) {
  if (!html) return false;
  if (!looksLikeRichHtml(html)) return html.trim().length > 0;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/[\u200B\u00A0]/g, '').trim().length > 0;
}

/**
 * Plain-text из HTML комментария (для уведомлений / цитат в тексте).
 * @param {string} html
 * @returns {string}
 */
export function toPlainText(html) {
  if (!html) return '';
  if (!looksLikeRichHtml(html)) return String(html).replace(/[\u200B\u00A0]/g, '').trim();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/[\u200B\u00A0]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * @param {HTMLElement | null} el
 * @returns {boolean}
 */
export function isEditorEmpty(el) {
  if (!el) return true;
  const text = (el.textContent || '').replace(/[\u200B\u00A0]/g, '').trim();
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
  return serializeChildren(root);
}

/**
 * @param {Element} el
 * @returns {boolean}
 */
function isAnimFrame(el) {
  return el.tagName === 'SPAN' && el.classList.contains(FRAME_CLASS);
}

/**
 * Блок/разрыв, который при сериализации уже даёт перевод строки
 * (не нужно добавлять ведущий `<br>` у следующего DIV/P).
 * @param {Node | null} node
 * @returns {boolean}
 */
function isBlockBoundaryNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = /** @type {Element} */ (node).tagName.toUpperCase();
  return tag === 'DIV' || tag === 'P' || tag === 'BR';
}

/**
 * @param {Element} parent
 * @returns {string}
 */
function serializeChildren(parent) {
  const children = Array.from(parent.childNodes);
  return children
    .map((child, i) => serializeSanitized(child, children[i - 1] || null))
    .join('');
}

/**
 * @param {Node} node
 * @param {Node | null} [prevSibling]
 * @returns {string}
 */
function serializeSanitized(node, prevSibling = null) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // Drop legacy spacers after anim frames (broke Enter / newlines).
    if (
      prevSibling &&
      prevSibling.nodeType === Node.ELEMENT_NODE &&
      isAnimFrame(/** @type {Element} */ (prevSibling)) &&
      /^[\u00A0\u200B]*$/.test(text)
    ) {
      return '';
    }
    return escapeHtml(text);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = /** @type {Element} */ (node);
  const tag = el.tagName.toUpperCase();

  if (tag === 'BR') return '<br>';

  if (!ALLOWED_TAGS.has(tag)) {
    return serializeChildren(el);
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
    const inner = serializeChildren(el);
    if (tag === 'P' || tag === 'DIV') {
      // Enter после inline (рамка, b/i/u, текст) даёт соседний <div>…</div>.
      // Без ведущего <br> блок схлопывается в одну строку при sanitize → в state
      // нет переноса, хотя в contenteditable он виден (skipNextSync).
      const prefix = prevSibling && !isBlockBoundaryNode(prevSibling) ? '<br>' : '';
      if (!inner || inner === '<br>') return `${prefix}<br>`;
      return `${prefix}${inner}<br>`;
    }
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
      return serializeChildren(el);
    }
    if (tag === 'A' && !attrs.includes('target=')) {
      attrs += ' target="_blank" rel="noopener noreferrer';
    }
  }

  const inner = serializeChildren(el);
  const lower = tag.toLowerCase();
  return `<${lower}${attrs}>${inner}</${lower}>`;
}

/**
 * @param {string} content
 * @returns {string}
 */
export function toDisplayHtml(content) {
  if (!content) return '';
  // Rich HTML или уже entity-escaped plain (sanitize без тегов) — один проход sanitize,
  // иначе `"`/`&`/`<>` показываются как `&quot;` / `&amp;` / `&lt;` / `&gt;`.
  let html;
  if (looksLikeRichHtml(content) || looksLikeEscapedPlain(content)) {
    html = sanitizePostHtml(content);
  } else {
    html = escapeHtml(content).replace(/\n/g, '<br>');
  }
  return linkifyPlainUrls(html);
}

/**
 * Известные TLD для bare-доменов без схемы (example.com, site.ru/path).
 * Без общего `word.word` — иначе ложные срабатывания на «конец предложения».
 */
const AUTOLINK_TLDS = [
  'com', 'ru', 'org', 'net', 'io', 'app', 'dev', 'me', 'info', 'biz', 'xyz',
  'online', 'site', 'store', 'shop', 'pro', 'tv', 'cc', 'co', 'uk', 'us', 'de',
  'fr', 'eu', 'ai', 'gg', 'to', 'ly', 'link', 'tech', 'cloud', 'club', 'blog',
  'space', 'art', 'design', 'media', 'news', 'today', 'live', 'world', 'zone',
  'email', 'page', 'website', 'su', 'by', 'kz', 'ua', 'рф'
].join('|');

/** http(s)://… | www.… | domain.tld(/path)? */
const AUTOLINK_RE = new RegExp(
  String.raw`\b(?:` +
    String.raw`(?:https?:\/\/|www\.)[^\s<>"'\`]+` +
    String.raw`|` +
    String.raw`(?:[a-z0-9\u0400-\u04ff](?:[a-z0-9\u0400-\u04ff-]*[a-z0-9\u0400-\u04ff])?\.)+(?:${AUTOLINK_TLDS})` +
    String.raw`(?::\d{2,5})?(?:[/?#][^\s<>"'\`]*)?` +
    String.raw`)`,
  'gi'
);

/**
 * Bare URL / www.… в тексте → кликабельные `<a>` (не трогает уже существующие ссылки).
 * @param {string} html
 * @returns {string}
 */
export function linkifyPlainUrls(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div id="__linkify_root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__linkify_root');
  if (!root) return html;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  /** @type {Text[]} */
  const textNodes = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(/** @type {Text} */ (node));
    node = walker.nextNode();
  }

  for (const textNode of textNodes) {
    if (!textNode.parentElement) continue;
    if (textNode.parentElement.closest('a')) continue;
    const raw = textNode.textContent || '';
    AUTOLINK_RE.lastIndex = 0;
    if (!AUTOLINK_RE.test(raw)) continue;
    AUTOLINK_RE.lastIndex = 0;

    const frag = doc.createDocumentFragment();
    let last = 0;
    let match;
    while ((match = AUTOLINK_RE.exec(raw)) !== null) {
      const start = match.index;
      const full = match[0];
      // Не линкуем домен из email (user@example.com).
      if (start > 0 && raw[start - 1] === '@') continue;
      let urlText = full;
      let trailing = '';
      while (urlText && /[.,;:!?)]+$/.test(urlText)) {
        trailing = urlText.slice(-1) + trailing;
        urlText = urlText.slice(0, -1);
      }
      if (start > last) {
        frag.appendChild(doc.createTextNode(raw.slice(last, start)));
      }
      const href = urlText ? normalizeHref(urlText) : null;
      if (href && urlText) {
        const a = doc.createElement('a');
        a.setAttribute('href', href);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.textContent = urlText;
        frag.appendChild(a);
      } else {
        frag.appendChild(doc.createTextNode(full));
        trailing = '';
      }
      if (trailing) frag.appendChild(doc.createTextNode(trailing));
      last = start + full.length;
    }
    if (last < raw.length) {
      frag.appendChild(doc.createTextNode(raw.slice(last)));
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  return root.innerHTML;
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
 * Нормализация URL для `<a href>`. Без схемы → `https://`.
 * @param {string} value
 * @returns {string | null}
 */
export function normalizeHref(value) {
  let href = String(value || '').trim();
  if (!href) return null;
  if (/^mailto:/i.test(href)) return href;
  if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
  try {
    // eslint-disable-next-line no-new
    new URL(href);
    return href;
  } catch {
    return null;
  }
}

/**
 * Текст и href текущего выделения / родительской ссылки (для модалки).
 * @param {HTMLElement | null} editor
 * @returns {{ title: string, href: string, hasSelection: boolean }}
 */
export function getLinkDraftFromSelection(editor) {
  const selection = window.getSelection();
  if (!editor || !selection || selection.rangeCount === 0) {
    return { title: '', href: '', hasSelection: false };
  }
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    return { title: '', href: '', hasSelection: false };
  }

  const anchor =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? /** @type {Element} */ (range.startContainer).closest?.('a')
      : range.startContainer.parentElement?.closest?.('a');
  const linkEl =
    anchor && editor.contains(anchor) ? /** @type {HTMLAnchorElement} */ (anchor) : null;

  if (linkEl) {
    return {
      title: (linkEl.textContent || '').replace(/[\u200B\u00A0]/g, '').trim(),
      href: linkEl.getAttribute('href') || '',
      hasSelection: true
    };
  }

  const title = selection.toString().replace(/[\u200B\u00A0]/g, '').trim();
  return { title, href: '', hasSelection: !selection.isCollapsed && title.length > 0 };
}

/**
 * Вставка / обновление гиперссылки на месте выделения.
 * @param {{ href: string, title: string }} payload
 * @param {HTMLElement} editor
 * @param {Range | null} [preferredRange]
 * @returns {boolean}
 */
export function applyHyperlink(payload, editor, preferredRange = null) {
  const href = normalizeHref(payload.href);
  const title = String(payload.title || '').replace(/[\u200B\u00A0]/g, '').trim();
  if (!href || !title || !editor) return false;

  const selection = window.getSelection();
  if (!selection) return false;
  editor.focus({ preventScroll: true });

  let range = null;
  if (preferredRange) {
    try {
      range = preferredRange.cloneRange();
    } catch {
      range = null;
    }
  }
  if (!range && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
    range = selection.getRangeAt(0);
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  const startEl =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? /** @type {Element} */ (range.startContainer)
      : range.startContainer.parentElement;
  const existing = startEl?.closest?.('a');
  if (existing && editor.contains(existing)) {
    const a = /** @type {HTMLAnchorElement} */ (existing);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = title;
    range = document.createRange();
    range.setStartAfter(a);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = title;

  range.deleteContents();
  range.insertNode(a);

  range.setStartAfter(a);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
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
  span.contentEditable = 'false';
  span.setAttribute('data-color', hex);
  span.setAttribute('data-variants', text);
  span.style.setProperty('--frame-color', hex);

  const label = document.createElement('span');
  label.className = 'post-anim-frame__text';
  label.contentEditable = 'true';
  label.textContent = text;
  span.appendChild(label);

  range.deleteContents();
  range.insertNode(span);

  // Курсор сразу после рамки — без spacer-символа (nbsp/zwsp ломали Enter).
  range.setStartAfter(span);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

/**
 * Готовит рамки в редакторе: contenteditable=false на чипе (клик после → текст вне рамки),
 * убирает legacy spacer после рамки.
 * @param {HTMLElement | null} editor
 */
export function ensureFrameCarets(editor) {
  if (!editor) return;
  editor.querySelectorAll(`.${FRAME_CLASS}`).forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    el.contentEditable = 'false';
    const textEl = el.querySelector('.post-anim-frame__text');
    if (textEl instanceof HTMLElement) {
      textEl.contentEditable = 'true';
    }
    const next = el.nextSibling;
    if (
      next &&
      next.nodeType === Node.TEXT_NODE &&
      /^[\u00A0\u200B]+$/.test(next.textContent || '')
    ) {
      next.remove();
    }
  });
}

/**
 * @returns {{ bold: boolean, italic: boolean, underline: boolean, link: boolean }}
 */
export function readActiveFormats() {
  try {
    let link = false;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const node = selection.anchorNode;
      const el =
        node?.nodeType === Node.ELEMENT_NODE
          ? /** @type {Element} */ (node)
          : node?.parentElement;
      link = Boolean(el?.closest?.('a'));
    }
    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      link
    };
  } catch {
    return { bold: false, italic: false, underline: false, link: false };
  }
}

/**
 * Lock `.post-anim-frame` width to the widest `|`-variant + padding so the chip
 * does not jump or ellipsize when cycling text. Display only (not in editor).
 * @param {HTMLElement} el
 * @param {HTMLElement} textEl
 * @param {string[]} variants
 */
function lockAnimFrameWidth(el, textEl, variants) {
  const prev = textEl.textContent;
  el.style.width = 'auto';
  el.style.minWidth = '';
  el.style.maxWidth = 'none';

  let max = 0;
  for (const variant of variants) {
    textEl.textContent = variant;
    max = Math.max(max, el.offsetWidth);
  }
  textEl.textContent = prev;

  const px = `${Math.ceil(max)}px`;
  el.style.width = px;
  el.style.minWidth = px;
  el.style.maxWidth = 'none';
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
