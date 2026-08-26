// @ts-check
import pb from '../../services/pb';
import { getUserAvatarData } from '../../lib/avatar';

export const MENTION_CLASS = 'post-mention';
export const MENTION_USER_CLASS = 'post-mention--user';
export const MENTION_POST_CLASS = 'post-mention--post';

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @typedef {'user' | 'post'} MentionKind
 * @typedef {'feed' | 'tournament'} PostMentionSource
 *
 * @typedef {{
 *   kind: 'user',
 *   start: number,
 *   end: number,
 *   query: string,
 *   range: Range
 * }} UserMentionDraft
 *
 * @typedef {{
 *   kind: 'post',
 *   start: number,
 *   end: number,
 *   query: string,
 *   range: Range
 * }} PostMentionDraft
 *
 * @typedef {UserMentionDraft | PostMentionDraft} MentionDraft
 *
 * @typedef {{
 *   id: string,
 *   full_name?: string,
 *   collectionId?: string,
 *   collectionName?: string,
 *   avatar?: string | string[] | null,
 *   avatar_url?: string
 * }} MentionUser
 *
 * @typedef {{
 *   id: string,
 *   post_number: number,
 *   source: PostMentionSource,
 *   preview?: string
 * }} MentionPost
 */

/**
 * @param {Element | null | undefined} el
 * @returns {boolean}
 */
export function isMentionEl(el) {
  return Boolean(el && el.nodeType === Node.ELEMENT_NODE && el.classList?.contains(MENTION_CLASS));
}

/**
 * Текст до каретки в пределах одного текстового узла + простой обход назад по inline.
 * @param {HTMLElement} editor
 * @returns {{ text: string, textNode: Text, offset: number } | null}
 */
function getCaretTextContext(editor) {
  const selection = window.getSelection();
  if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return null;

  /** @type {Node} */
  let node = range.startContainer;
  let offset = range.startOffset;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = /** @type {Element} */ (node);
    if (offset > 0) {
      const prev = el.childNodes[offset - 1];
      if (prev?.nodeType === Node.TEXT_NODE) {
        node = prev;
        offset = prev.textContent?.length || 0;
      } else if (isMentionEl(/** @type {Element} */ (prev)) || prev?.nodeType === Node.ELEMENT_NODE) {
        return null;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  if (node.nodeType !== Node.TEXT_NODE) return null;
  if (node.parentElement?.closest?.(`.${MENTION_CLASS}`)) return null;

  const textNode = /** @type {Text} */ (node);
  const full = textNode.textContent || '';
  const before = full.slice(0, offset);
  return { text: before, textNode, offset };
}

/**
 * Ищет активный `@…` / `@#…` непосредственно перед кареткой.
 * @param {HTMLElement | null} editor
 * @returns {MentionDraft | null}
 */
export function getMentionDraftAtCaret(editor) {
  if (!editor) return null;
  const ctx = getCaretTextContext(editor);
  if (!ctx) return null;

  const { text, textNode, offset } = ctx;
  // `@` + опционально `#` + хвост без пробелов/nbsp.
  const match = text.match(/@(#?)([^\s@\u00A0\u200B]*)$/);
  if (!match) return null;

  const atIndex = match.index ?? -1;
  if (atIndex < 0) return null;

  // Не триггерим, если перед `@` буква/цифра (email-like).
  if (atIndex > 0) {
    const prev = text[atIndex - 1];
    if (/[0-9A-Za-zА-Яа-яЁё_]/.test(prev)) return null;
  }

  const hash = match[1] === '#';
  const query = match[2] || '';
  const start = atIndex;
  const end = offset;

  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);

  if (hash) {
    return { kind: 'post', start, end, query, range };
  }
  return { kind: 'user', start, end, query, range };
}

/**
 * @param {string} name
 * @returns {string}
 */
function initialFromName(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

/**
 * @param {MentionUser} user
 * @returns {HTMLElement}
 */
export function buildUserMentionEl(user) {
  const name = String(user.full_name || '').trim() || 'Участник';
  const avatar = getUserAvatarData(user);

  const span = document.createElement('span');
  span.className = `${MENTION_CLASS} ${MENTION_USER_CLASS}`;
  span.contentEditable = 'false';
  span.setAttribute('data-mention', 'user');
  span.setAttribute('data-user-id', user.id);
  span.setAttribute('data-name', name);
  if (avatar.hasAvatar && avatar.src) {
    span.setAttribute('data-avatar', avatar.src);
  }
  span.setAttribute('role', 'link');
  span.setAttribute('tabindex', '0');
  span.setAttribute('aria-label', `Профиль ${name}`);

  if (avatar.hasAvatar && avatar.src) {
    const img = document.createElement('img');
    img.className = 'post-mention__avatar';
    img.src = avatar.src;
    img.alt = '';
    img.draggable = false;
    span.appendChild(img);
  } else {
    const fallback = document.createElement('span');
    fallback.className = 'post-mention__avatar post-mention__avatar--fallback';
    fallback.textContent = initialFromName(name);
    span.appendChild(fallback);
  }

  const label = document.createElement('span');
  label.className = 'post-mention__label';
  label.textContent = name;
  span.appendChild(label);

  return span;
}

/**
 * @param {MentionPost} post
 * @returns {HTMLElement}
 */
export function buildPostMentionEl(post) {
  const source = post.source === 'tournament' ? 'tournament' : 'feed';
  const sourceLabel = source === 'tournament' ? 'Турнир' : 'Лента';
  const num = Number(post.post_number) || 0;

  const span = document.createElement('span');
  span.className = `${MENTION_CLASS} ${MENTION_POST_CLASS}`;
  span.contentEditable = 'false';
  span.setAttribute('data-mention', 'post');
  span.setAttribute('data-post-id', post.id);
  span.setAttribute('data-post-source', source);
  span.setAttribute('data-post-number', String(num));
  span.setAttribute('role', 'link');
  span.setAttribute('tabindex', '0');
  span.setAttribute('aria-label', `Публикация #${num} · ${sourceLabel}`);

  const icon = document.createElement('span');
  icon.className = 'post-mention__doc-icon';
  icon.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i += 1) {
    const line = document.createElement('span');
    line.className = 'post-mention__doc-line';
    icon.appendChild(line);
  }
  span.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'post-mention__label';
  label.textContent = `#${num} ${sourceLabel}`;
  span.appendChild(label);

  return span;
}

/**
 * Вставляет mention-чип вместо draft-range, ставит каретку после + пробел.
 * @param {HTMLElement} editor
 * @param {MentionDraft} draft
 * @param {HTMLElement} chip
 * @returns {boolean}
 */
export function insertMentionChip(editor, draft, chip) {
  const selection = window.getSelection();
  if (!selection) return false;

  editor.focus({ preventScroll: true });
  let range;
  try {
    range = draft.range.cloneRange();
  } catch {
    return false;
  }

  range.deleteContents();
  range.insertNode(chip);

  const space = document.createTextNode('\u00A0');
  if (chip.nextSibling) {
    chip.parentNode?.insertBefore(space, chip.nextSibling);
  } else {
    chip.parentNode?.appendChild(space);
  }

  const after = document.createRange();
  after.setStart(space, 1);
  after.collapse(true);
  selection.removeAllRanges();
  selection.addRange(after);
  return true;
}

/**
 * @param {HTMLElement | null} editor
 */
export function ensureMentionCarets(editor) {
  if (!editor) return;
  editor.querySelectorAll(`.${MENTION_CLASS}`).forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    el.contentEditable = 'false';
  });
}

/**
 * Сериализация mention-span для sanitize.
 * @param {Element} el
 * @returns {string}
 */
export function serializeMentionEl(el) {
  const type = el.getAttribute('data-mention') || '';
  if (type === 'user') {
    const id = (el.getAttribute('data-user-id') || '').trim();
    const name = (el.getAttribute('data-name') || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!id || !name) return escapeHtml(name || '');
    const avatar = (el.getAttribute('data-avatar') || '').trim();
    const avatarAttr = avatar ? ` data-avatar="${escapeHtml(avatar)}"` : '';
    const avatarHtml = avatar
      ? `<img class="post-mention__avatar" src="${escapeHtml(avatar)}" alt="">`
      : `<span class="post-mention__avatar post-mention__avatar--fallback">${escapeHtml(initialFromName(name))}</span>`;
    return (
      `<span class="${MENTION_CLASS} ${MENTION_USER_CLASS}" contenteditable="false" ` +
      `data-mention="user" data-user-id="${escapeHtml(id)}" data-name="${escapeHtml(name)}"${avatarAttr} ` +
      `role="link" tabindex="0" aria-label="Профиль ${escapeHtml(name)}">` +
      `${avatarHtml}<span class="post-mention__label">${escapeHtml(name)}</span>` +
      `</span>`
    );
  }

  if (type === 'post') {
    const id = (el.getAttribute('data-post-id') || '').trim();
    const sourceRaw = el.getAttribute('data-post-source') || 'feed';
    const source = sourceRaw === 'tournament' ? 'tournament' : 'feed';
    const sourceLabel = source === 'tournament' ? 'Турнир' : 'Лента';
    const num = Number(el.getAttribute('data-post-number') || 0);
    if (!id || !Number.isFinite(num) || num <= 0) return escapeHtml(`#${num || ''} ${sourceLabel}`);
    return (
      `<span class="${MENTION_CLASS} ${MENTION_POST_CLASS}" contenteditable="false" ` +
      `data-mention="post" data-post-id="${escapeHtml(id)}" data-post-source="${source}" ` +
      `data-post-number="${num}" role="link" tabindex="0" ` +
      `aria-label="Публикация #${num} · ${sourceLabel}">` +
      `<span class="post-mention__doc-icon" aria-hidden="true">` +
      `<span class="post-mention__doc-line"></span>` +
      `<span class="post-mention__doc-line"></span>` +
      `<span class="post-mention__doc-line"></span>` +
      `</span>` +
      `<span class="post-mention__label">#${num} ${sourceLabel}</span>` +
      `</span>`
    );
  }

  return escapeHtml((el.textContent || '').replace(/\s+/g, ' ').trim());
}

/**
 * @param {string} query
 * @param {{ signal?: AbortSignal, limit?: number }} [options]
 * @returns {Promise<MentionUser[]>}
 */
export async function searchMentionUsers(query, { signal, limit = 8 } = {}) {
  const q = String(query || '').trim();
  const filterParts = ['is_banned != true', 'is_visible != false'];
  if (q) {
    filterParts.push(pb.filter('full_name ~ {:q}', { q }));
  }
  const result = await pb.collection('users').getList(1, limit, {
    filter: filterParts.join(' && '),
    fields: 'id,collectionId,collectionName,full_name,avatar,avatar_url',
    sort: 'full_name',
    requestKey: null,
    signal
  });
  return /** @type {MentionUser[]} */ (result.items || []);
}

/**
 * @param {string} rawQuery номер (цифры)
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<MentionPost[]>}
 */
export async function searchMentionPosts(rawQuery, { signal } = {}) {
  const digits = String(rawQuery || '').replace(/\D/g, '');
  if (!digits) return [];
  const num = Number(digits);
  if (!Number.isFinite(num) || num <= 0) return [];

  const filter = `post_number = ${num} && is_deleted != true && is_scheduled != true`;
  const fields = 'id,post_number,content,created';

  const [feedRes, tournamentRes] = await Promise.all([
    pb.collection('posts').getList(1, 5, { filter, fields, sort: '-created', requestKey: null, signal }),
    pb.collection('tournament_posts').getList(1, 5, {
      filter,
      fields,
      sort: '-created',
      requestKey: null,
      signal
    })
  ]);

  /** @param {any} rec @param {PostMentionSource} source */
  const mapItem = (rec, source) => {
    const plain = String(rec.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      id: String(rec.id),
      post_number: Number(rec.post_number) || num,
      source,
      preview: plain.slice(0, 80)
    };
  };

  return [
    ...(feedRes.items || []).map((rec) => mapItem(rec, 'feed')),
    ...(tournamentRes.items || []).map((rec) => mapItem(rec, 'tournament'))
  ];
}
