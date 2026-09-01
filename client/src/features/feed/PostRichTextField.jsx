import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import gsap from 'gsap';
import PostFormatToolbar from './PostFormatToolbar';
import PostLinkModal from './PostLinkModal';
import FrameColorPicker from './FrameColorPicker';
import MentionSuggestPopup from './MentionSuggestPopup';
import EmojiPicker, { EMOJI_ATTACH_SWAP_MS } from './emoji/EmojiPicker';
import { isMobileMaxPlatform } from '../shop/buyMessage';
import {
  FRAME_CLASS,
  applyAnimFrame,
  applyFormatCommand,
  applyHyperlink,
  ensureFrameCarets,
  getEditorHtml,
  getLinkDraftFromSelection,
  hasVisibleText,
  isEditorEmpty,
  normalizeHexColor,
  readActiveFormats
} from './postRichText';
import {
  MENTION_CLASS,
  MENTION_REMOVE_CLASS,
  buildPostMentionEl,
  buildUserMentionEl,
  deleteAdjacentMention,
  getMentionDraftAtCaret,
  insertMentionChip,
  removeMentionEl,
  searchMentionPosts,
  searchMentionUsers,
  updateMentionCaretProximity
} from './postMentions';
import { applyMentionMissingStatuses } from './mentionStatus';
import { usePlayers } from '../../hooks/usePlayers';

const FLOATING_ENTER_MS = 0.28;
const FLOATING_EXIT_MS = 0.2;
/** Фоновый запрос поиска (не показ). */
const MENTION_FETCH_DEBOUNCE_MS = 120;
/** Показ результатов после паузы ввода. */
const MENTION_SHOW_DELAY_MS = 500;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Rich-text поле: статичный тулбар + всплывающий при выделении + опциональная анимационная рамка.
 * `@имя` / `@#номер` — mention-саджест участников и публикаций.
 *
 * Imperative handle: `{ focus(), clear() }`.
 *
 * @param {{
 *   id?: string,
 *   value: string,
 *   onChange: (html: string) => void,
 *   placeholder?: string,
 *   'aria-label'?: string,
 *   enableFrame?: boolean,
 *   enableMentions?: boolean,
 *   compact?: boolean,
 *   revealToolbarOnFocus?: boolean,
 *   singleLine?: boolean,
 *   toolbarExtra?: React.ReactNode,
 *   editorEnd?: React.ReactNode,
 *   fieldEmojiMode?: 'always' | 'after-text',
 *   onFocus?: () => void
 * }} props
 */
const PostRichTextField = forwardRef(function PostRichTextField(
  {
    id: idProp,
    value,
    onChange,
    placeholder = 'Что нового в секции?…',
    'aria-label': ariaLabel = 'Текст публикации',
    enableFrame = true,
    enableMentions = true,
    compact = false,
    revealToolbarOnFocus = false,
    singleLine = false,
    toolbarExtra = null,
    editorEnd = null,
    fieldEmojiMode = 'always',
    onFocus
  },
  ref
) {
  const autoId = useId();
  const id = idProp || autoId;
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const editorRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const floatingRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const savedRangeRef = useRef(/** @type {Range | null} */ (null));
  const mentionDraftRef = useRef(/** @type {import('./postMentions').MentionDraft | null} */ (null));
  const mentionAbortRef = useRef(/** @type {AbortController | null} */ (null));
  const { data: players } = usePlayers();
  const mentionFetchTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const mentionShowTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const mentionPendingRef = useRef(
    /** @type {{ kind: 'user' | 'post', query: string, users: any[], posts: any[], loading: boolean } | null} */ (
      null
    )
  );
  const valueRef = useRef(value);
  valueRef.current = value;
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    link: false
  });
  const [empty, setEmpty] = useState(true);
  const [focused, setFocused] = useState(false);
  const [frameOpen, setFrameOpen] = useState(false);
  const [frameColor, setFrameColor] = useState('#FF4D6D');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ title: '', href: '' });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiMode, setEmojiMode] = useState(
    /** @type {'comment' | 'post' | 'field' | 'toolbar'} */ ('comment')
  );
  const [emojiLayout, setEmojiLayout] = useState(
    /** @type {{ top?: number, bottom?: number, left: number, width: number, height: number } | null} */ (
      null
    )
  );
  const emojiEnabled = !isMobileMaxPlatform();
  const fieldEmojiBtnRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const [fieldEmojiVisible, setFieldEmojiVisible] = useState(
    fieldEmojiMode === 'always' && emojiEnabled
  );
  const [floatingPos, setFloatingPos] = useState(
    /** @type {{ top: number, left: number } | null} */ (null)
  );
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [floatingMounted, setFloatingMounted] = useState(false);
  const floatingOpenRef = useRef(false);
  floatingOpenRef.current = floatingOpen;
  const hideFloatingTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const skipNextSync = useRef(false);
  const lastClearedHtmlRef = useRef(/** @type {string | null} */ (null));
  const showTopToolbar = !revealToolbarOnFocus || focused || frameOpen;

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMounted, setMentionMounted] = useState(false);
  const [mentionKind, setMentionKind] = useState(/** @type {'user' | 'post'} */ ('user'));
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionUsers, setMentionUsers] = useState(/** @type {any[]} */ ([]));
  const [mentionPosts, setMentionPosts] = useState(/** @type {any[]} */ ([]));
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionAnchor, setMentionAnchor] = useState(
    /** @type {{ top: number, left: number, bottom: number, width: number } | null} */ (null)
  );

  const hideFloatingToolbar = useCallback((immediate = false) => {
    if (hideFloatingTimerRef.current) {
      clearTimeout(hideFloatingTimerRef.current);
      hideFloatingTimerRef.current = null;
    }
    if (immediate) {
      setFloatingOpen(false);
      return;
    }
    hideFloatingTimerRef.current = setTimeout(() => {
      hideFloatingTimerRef.current = null;
      setFloatingOpen(false);
    }, 70);
  }, []);

  const closeMentionSuggest = useCallback((immediate = false) => {
    if (mentionFetchTimerRef.current) {
      clearTimeout(mentionFetchTimerRef.current);
      mentionFetchTimerRef.current = null;
    }
    if (mentionShowTimerRef.current) {
      clearTimeout(mentionShowTimerRef.current);
      mentionShowTimerRef.current = null;
    }
    if (mentionAbortRef.current) {
      mentionAbortRef.current.abort();
      mentionAbortRef.current = null;
    }
    mentionDraftRef.current = null;
    mentionPendingRef.current = null;
    if (immediate) {
      setMentionOpen(false);
      setMentionMounted(false);
      setMentionAnchor(null);
      setMentionUsers([]);
      setMentionPosts([]);
      setMentionLoading(false);
      return;
    }
    setMentionOpen(false);
  }, []);

  useEffect(
    () => () => {
      if (hideFloatingTimerRef.current) clearTimeout(hideFloatingTimerRef.current);
      if (mentionFetchTimerRef.current) clearTimeout(mentionFetchTimerRef.current);
      if (mentionShowTimerRef.current) clearTimeout(mentionShowTimerRef.current);
      if (mentionAbortRef.current) mentionAbortRef.current.abort();
    },
    []
  );

  const clearEditorDom = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = '';
    setEmpty(true);
    skipNextSync.current = true;
  }, []);

  const syncEmptyAndValue = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setEmpty(isEditorEmpty(el));
    onChange(getEditorHtml(el));
  }, [onChange]);

  useImperativeHandle(
    ref,
    () => ({
      focus: (opts) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        const selection = window.getSelection();
        if (!selection) return;
        if (opts?.restoreSaved && savedRangeRef.current) {
          try {
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
            return;
          } catch {
            // fall through to end
          }
        }
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      },
      saveSelection: () => {
        const el = editorRef.current;
        const selection = window.getSelection();
        if (!el || !selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer)) return;
        savedRangeRef.current = range.cloneRange();
      },
      restoreSelection: () => {
        const el = editorRef.current;
        const range = savedRangeRef.current;
        const selection = window.getSelection();
        if (!el || !range || !selection) return;
        el.focus({ preventScroll: true });
        try {
          selection.removeAllRanges();
          selection.addRange(range);
        } catch {
          // ignore stale range
        }
      },
      insertTextAtCaret: (text) => {
        const el = editorRef.current;
        if (!el || !text) return;
        el.focus({ preventScroll: true });
        const selection = window.getSelection();
        let range = savedRangeRef.current;
        if (selection && selection.rangeCount > 0) {
          const live = selection.getRangeAt(0);
          if (el.contains(live.commonAncestorContainer)) {
            range = live;
          }
        }
        if (!range || !el.contains(range.commonAncestorContainer)) {
          range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
        }
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        savedRangeRef.current = range.cloneRange();
        skipNextSync.current = true;
        syncEmptyAndValue();
      },
      clear: () => {
        const el = editorRef.current;
        lastClearedHtmlRef.current = el ? getEditorHtml(el) : '';
        valueRef.current = '';
        clearEditorDom();
        closeMentionSuggest(true);
      },
      getEditorElement: () => editorRef.current
    }),
    [clearEditorDom, closeMentionSuggest, syncEmptyAndValue]
  );
  const refreshActive = useCallback(() => {
    setActive(readActiveFormats());
  }, []);

  const saveSelection = useCallback(() => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!el || !range || !selection) return;
    el.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const updateMentionAnchorFromToolbar = useCallback(() => {
    const toolbarRow = rootRef.current?.querySelector('.post-rich-text__toolbar-row');
    const editor = editorRef.current;
    const tr = toolbarRow?.getBoundingClientRect();
    const er = editor?.getBoundingClientRect();
    if (!tr && !er) return;
    const left = Math.round(tr?.left ?? er?.left ?? 8);
    const width = Math.round(tr?.width ?? er?.width ?? 220);
    const toolbarTop = Math.round(tr?.top ?? er?.top ?? 0);
    setMentionAnchor({
      top: toolbarTop,
      left,
      bottom: toolbarTop,
      width: Math.max(width, 220)
    });
  }, []);

  const flushMentionShow = useCallback(() => {
    const pending = mentionPendingRef.current;
    if (!pending || !mentionDraftRef.current) return;
    setMentionKind(pending.kind);
    setMentionQuery(pending.query);
    setMentionUsers(pending.users);
    setMentionPosts(pending.posts);
    setMentionLoading(pending.loading);
    setMentionActiveIndex((prev) => {
      const count = pending.kind === 'user' ? pending.users.length : pending.posts.length;
      if (count <= 0) return 0;
      return Math.min(prev, count - 1);
    });
    setMentionMounted(true);
    setMentionOpen(true);
  }, []);

  const updateMentionSuggest = useCallback(() => {
    if (!enableMentions) {
      closeMentionSuggest(true);
      return;
    }
    const el = editorRef.current;
    const draft = getMentionDraftAtCaret(el);
    if (!draft) {
      closeMentionSuggest();
      return;
    }

    mentionDraftRef.current = draft;
    hideFloatingToolbar(true);
    updateMentionAnchorFromToolbar();

    // Показ — после паузы 0.5s с последней буквы; данные подгружаются параллельно.
    if (mentionShowTimerRef.current) clearTimeout(mentionShowTimerRef.current);
    mentionShowTimerRef.current = setTimeout(() => {
      mentionShowTimerRef.current = null;
      flushMentionShow();
    }, MENTION_SHOW_DELAY_MS);

    if (mentionFetchTimerRef.current) clearTimeout(mentionFetchTimerRef.current);
    mentionFetchTimerRef.current = setTimeout(async () => {
      mentionFetchTimerRef.current = null;
      if (mentionAbortRef.current) mentionAbortRef.current.abort();
      const ac = new AbortController();
      mentionAbortRef.current = ac;
      mentionPendingRef.current = {
        kind: draft.kind,
        query: draft.query,
        users: [],
        posts: [],
        loading: true
      };
      if (!mentionShowTimerRef.current && mentionDraftRef.current) {
        flushMentionShow();
      }
      try {
        if (draft.kind === 'user') {
          const users = await searchMentionUsers(draft.query, { signal: ac.signal });
          if (ac.signal.aborted) return;
          mentionPendingRef.current = {
            kind: 'user',
            query: draft.query,
            users,
            posts: [],
            loading: false
          };
        } else {
          const posts = await searchMentionPosts(draft.query, { signal: ac.signal });
          if (ac.signal.aborted) return;
          mentionPendingRef.current = {
            kind: 'post',
            query: draft.query,
            users: [],
            posts,
            loading: false
          };
        }
        // Если пауза показа уже прошла — сразу обновить открытый список.
        if (!mentionShowTimerRef.current && mentionDraftRef.current) {
          flushMentionShow();
        }
      } catch {
        if (ac.signal.aborted) return;
        mentionPendingRef.current = {
          kind: draft.kind,
          query: draft.query,
          users: [],
          posts: [],
          loading: false
        };
        if (!mentionShowTimerRef.current && mentionDraftRef.current) {
          flushMentionShow();
        }
      }
    }, MENTION_FETCH_DEBOUNCE_MS);
  }, [closeMentionSuggest, enableMentions, flushMentionShow, hideFloatingToolbar, updateMentionAnchorFromToolbar]);

  useEffect(() => {
    if (!mentionOpen && !mentionMounted) return undefined;
    const refresh = () => updateMentionAnchorFromToolbar();
    refresh();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', refresh);
    vv?.addEventListener('scroll', refresh);
    window.addEventListener('resize', refresh);
    return () => {
      vv?.removeEventListener('resize', refresh);
      vv?.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, [mentionMounted, mentionOpen, updateMentionAnchorFromToolbar]);

  const applyMentionUser = useCallback(
    (user) => {
      const el = editorRef.current;
      const draft = mentionDraftRef.current;
      if (!el || !draft || draft.kind !== 'user' || !user?.id) return;
      const chip = buildUserMentionEl(user);
      insertMentionChip(el, draft, chip);
      closeMentionSuggest(true);
      skipNextSync.current = true;
      syncEmptyAndValue();
      refreshActive();
    },
    [closeMentionSuggest, refreshActive, syncEmptyAndValue]
  );

  const applyMentionPost = useCallback(
    (post) => {
      const el = editorRef.current;
      const draft = mentionDraftRef.current;
      if (!el || !draft || draft.kind !== 'post' || !post?.id) return;
      const chip = buildPostMentionEl(post);
      insertMentionChip(el, draft, chip);
      closeMentionSuggest(true);
      skipNextSync.current = true;
      syncEmptyAndValue();
      refreshActive();
    },
    [closeMentionSuggest, refreshActive, syncEmptyAndValue]
  );

  const updateSelectionToolbar = useCallback(() => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      hideFloatingToolbar();
      return;
    }
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (!anchor || !focus || !el.contains(anchor) || !el.contains(focus)) {
      hideFloatingToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hideFloatingToolbar();
      return;
    }

    const toolbarWidth = floatingRef.current?.offsetWidth || 180;
    const gap = 20;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2),
      window.innerWidth - toolbarWidth - 8
    );
    let top = rect.bottom + gap;
    if (top + 44 > window.innerHeight - 8) {
      top = Math.max(8, rect.top - 44 - gap);
    }

    setFloatingPos((prev) => {
      if (prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) {
        return prev;
      }
      return { top, left };
    });
    if (hideFloatingTimerRef.current) {
      clearTimeout(hideFloatingTimerRef.current);
      hideFloatingTimerRef.current = null;
    }
    setFloatingMounted(true);
    setFloatingOpen(true);
  }, [hideFloatingToolbar]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || '';
    if (skipNextSync.current) {
      skipNextSync.current = false;
      if (getEditorHtml(el) === next || el.innerHTML === next) {
        ensureFrameCarets(el);
        updateMentionCaretProximity(el);
        void applyMentionMissingStatuses(el, { players });
        return;
      }
    }
    if (el.innerHTML !== next) {
      const hadFocus = document.activeElement === el;
      const selection = window.getSelection();
      let saved = savedRangeRef.current;
      if (hadFocus && selection && selection.rangeCount > 0) {
        const live = selection.getRangeAt(0);
        if (el.contains(live.commonAncestorContainer)) {
          saved = live.cloneRange();
          savedRangeRef.current = saved;
        }
      }
      el.innerHTML = next;
      ensureFrameCarets(el);
      setEmpty(isEditorEmpty(el));
      if (hadFocus && saved) {
        try {
          el.focus({ preventScroll: true });
          selection?.removeAllRanges();
          selection?.addRange(saved);
        } catch {
          // stale range after DOM rewrite — leave caret
        }
      }
    } else {
      ensureFrameCarets(el);
    }
    updateMentionCaretProximity(el);
    void applyMentionMissingStatuses(el, { players });
  }, [value, players]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || !enableMentions) return undefined;

    /**
     * Capture: одно нажатие Backspace/Delete удаляет чип «вплотную»
     * (в т.ч. когда браузер сначала выделяет atomic contenteditable=false).
     * @param {KeyboardEvent | InputEvent} event
     */
    const handleDeleteGesture = (event) => {
      let direction = /** @type {'backward' | 'forward' | null} */ (null);
      if (event.type === 'keydown') {
        const key = /** @type {KeyboardEvent} */ (event).key;
        if (key === 'Backspace') direction = 'backward';
        else if (key === 'Delete') direction = 'forward';
      } else if (event.type === 'beforeinput') {
        const inputType = /** @type {InputEvent} */ (event).inputType;
        if (inputType === 'deleteContentBackward') direction = 'backward';
        else if (inputType === 'deleteContentForward') direction = 'forward';
      }
      if (!direction) return;
      if (!deleteAdjacentMention(el, direction)) return;
      event.preventDefault();
      if ('stopImmediatePropagation' in event) {
        event.stopImmediatePropagation();
      }
      closeMentionSuggest(true);
      skipNextSync.current = true;
      syncEmptyAndValue();
      updateMentionCaretProximity(el);
    };

    el.addEventListener('keydown', /** @type {EventListener} */ (handleDeleteGesture), true);
    el.addEventListener('beforeinput', /** @type {EventListener} */ (handleDeleteGesture), true);
    return () => {
      el.removeEventListener('keydown', /** @type {EventListener} */ (handleDeleteGesture), true);
      el.removeEventListener('beforeinput', /** @type {EventListener} */ (handleDeleteGesture), true);
    };
  }, [closeMentionSuggest, enableMentions, syncEmptyAndValue]);

  useEffect(() => {
    const onSelectionChange = () => {
      const el = editorRef.current;
      if (!el) return;
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) {
        hideFloatingToolbar();
        updateMentionCaretProximity(el);
        return;
      }
      const node = sel.anchorNode;
      if (!node || !el.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node)) {
        hideFloatingToolbar();
        updateMentionCaretProximity(el);
        return;
      }
      saveSelection();
      refreshActive();
      updateSelectionToolbar();
      updateMentionCaretProximity(el);
      if (enableMentions && sel.isCollapsed) {
        updateMentionSuggest();
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [
    enableMentions,
    hideFloatingToolbar,
    refreshActive,
    saveSelection,
    updateMentionSuggest,
    updateSelectionToolbar
  ]);

  useLayoutEffect(() => {
    if (!floatingOpen) return undefined;
    const onReposition = () => updateSelectionToolbar();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [floatingOpen, updateSelectionToolbar]);

  useLayoutEffect(() => {
    if (!floatingMounted) return undefined;
    const el = floatingRef.current;
    if (!el) return undefined;

    gsap.killTweensOf(el);
    const reduced = prefersReducedMotion();

    if (floatingOpen) {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.88, y: 12, pointerEvents: 'none' },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          pointerEvents: 'auto',
          duration: reduced ? 0.01 : FLOATING_ENTER_MS,
          ease: 'power3.out'
        }
      );
      return () => {
        gsap.killTweensOf(el);
      };
    }

    const tween = gsap.to(el, {
      opacity: 0,
      scale: 0.92,
      y: 8,
      pointerEvents: 'none',
      duration: reduced ? 0.01 : FLOATING_EXIT_MS,
      ease: 'power2.in',
      onComplete: () => {
        if (floatingOpenRef.current) return;
        setFloatingMounted(false);
        setFloatingPos(null);
      }
    });
    return () => {
      tween.kill();
    };
  }, [floatingOpen, floatingMounted]);

  useEffect(() => {
    if (!frameOpen) return undefined;
    const onPointerDown = (e) => {
      const root = rootRef.current;
      const floating = floatingRef.current;
      if (e.target instanceof Node) {
        if (root?.contains(e.target) || floating?.contains(e.target)) return;
      }
      setFrameOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [frameOpen]);

  useEffect(() => {
    if (!mentionOpen) return undefined;
    const onPointerDown = (e) => {
      const root = rootRef.current;
      const popup = document.querySelector('.mention-suggest');
      if (e.target instanceof Node) {
        if (root?.contains(e.target) || popup?.contains(e.target)) return;
      }
      closeMentionSuggest();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [mentionOpen, closeMentionSuggest]);

  const openEmojiPicker = useCallback((_mode, _triggerEl) => {
    if (!emojiEnabled) return;
    if (emojiOpen) {
      setEmojiOpen(false);
      return;
    }

    saveSelection();
    setFrameOpen(false);
    hideFloatingToolbar(true);
    closeMentionSuggest(true);

    const modalEl =
      rootRef.current?.closest('.ui-modal-content') ||
      rootRef.current?.closest('.ui-modal');
    const modalRect = modalEl?.getBoundingClientRect() || null;
    const vw = window.innerWidth;
    const placement = compact ? 'comment' : 'post';
    const editor = editorRef.current;
    const er = editor?.getBoundingClientRect();
    if (!er) return;

    if (placement === 'comment') {
      const row =
        rootRef.current?.closest('.comment-compose__row') ||
        rootRef.current?.closest('.comment-edit-inline-form') ||
        rootRef.current;
      const fieldCol =
        rootRef.current?.closest('.comment-compose__field-col') || rootRef.current;
      const sendBtn =
        row instanceof Element ? row.querySelector('.comment-send-btn') : null;
      const toolbarRow = rootRef.current?.querySelector('.post-rich-text__toolbar-row');
      const fr = fieldCol?.getBoundingClientRect();
      const sr = sendBtn?.getBoundingClientRect();
      const tr = toolbarRow?.getBoundingClientRect();
      const left = Math.round(fr?.left ?? er.left);
      const right = Math.round(sr?.right ?? fr?.right ?? er.right);
      const width = Math.max(200, right - left);
      const height = Math.min(280, Math.max(220, Math.round(vw * 0.72)));
      // Нижняя граница панели = верх строки форматирования (панель выше тулбара).
      const bottom = Math.round(tr?.top ?? rootRef.current?.getBoundingClientRect().top ?? er.top);
      setEmojiMode('comment');
      setEmojiLayout({
        bottom,
        left,
        width,
        height
      });
    } else {
      const inset = 10;
      const gap = 6;
      const bottomPad = 10;
      const left = modalRect
        ? Math.round(modalRect.left + inset)
        : Math.round(er.left);
      const width = modalRect
        ? Math.max(200, Math.round(modalRect.width - inset * 2))
        : Math.max(200, Math.round(er.width));
      const top = Math.round(er.bottom + gap);
      const bottomEdge = modalRect
        ? Math.round(modalRect.bottom - bottomPad)
        : Math.round(window.innerHeight - bottomPad);
      const height = Math.max(160, bottomEdge - top);
      setEmojiMode('post');
      setEmojiLayout({
        top,
        left,
        width,
        height
      });
    }

    setEmojiOpen(true);
  }, [
    closeMentionSuggest,
    compact,
    emojiEnabled,
    emojiOpen,
    hideFloatingToolbar,
    saveSelection
  ]);

  useEffect(() => {
    if (!emojiEnabled) {
      setFieldEmojiVisible(false);
      if (emojiOpen) setEmojiOpen(false);
      return undefined;
    }
    if (fieldEmojiMode === 'always') {
      setFieldEmojiVisible(true);
      return undefined;
    }
    const hasText = hasVisibleText(value);
    if (hasText) {
      const timer = window.setTimeout(() => setFieldEmojiVisible(true), EMOJI_ATTACH_SWAP_MS);
      return () => window.clearTimeout(timer);
    }
    setFieldEmojiVisible(false);
    return undefined;
  }, [emojiEnabled, emojiOpen, fieldEmojiMode, value]);

  const insertEmojiAtCaret = useCallback(
    (emoji) => {
      const el = editorRef.current;
      if (!el || !emoji) return;
      el.focus({ preventScroll: true });
      const selection = window.getSelection();
      let range = savedRangeRef.current;
      if (selection && selection.rangeCount > 0) {
        const live = selection.getRangeAt(0);
        if (el.contains(live.commonAncestorContainer)) {
          range = live;
        }
      }
      if (!range || !el.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      range.deleteContents();
      const node = document.createTextNode(emoji);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      savedRangeRef.current = range.cloneRange();
      skipNextSync.current = true;
      syncEmptyAndValue();
    },
    [syncEmptyAndValue]
  );

  const deleteEmojiBackspace = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const selection = window.getSelection();
    let range = savedRangeRef.current;
    if (selection && selection.rangeCount > 0) {
      const live = selection.getRangeAt(0);
      if (el.contains(live.commonAncestorContainer)) {
        range = live;
      }
    }
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.execCommand('delete');
    saveSelection();
    skipNextSync.current = true;
    syncEmptyAndValue();
  }, [saveSelection, syncEmptyAndValue]);

  const handleCommand = (command) => {
    const el = editorRef.current;
    if (!el) return;

    if (command === 'emoji') {
      const fromFloating = floatingRef.current?.querySelector('[data-emoji-source="toolbar"]');
      const fromRoot = rootRef.current?.querySelector('[data-emoji-source="toolbar"]');
      openEmojiPicker('toolbar', /** @type {Element | null} */ (fromFloating || fromRoot));
      return;
    }

    if (command === 'mention') {
      if (!enableMentions) return;
      saveSelection();
      restoreSelection();
      const el = editorRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      document.execCommand('insertText', false, '@');
      skipNextSync.current = true;
      syncEmptyAndValue();
      refreshActive();
      updateMentionSuggest();
      return;
    }

    if (command === 'frame') {
      if (!enableFrame) return;
      saveSelection();
      setFrameOpen((open) => !open);
      return;
    }

    if (command === 'link') {
      saveSelection();
      setFrameOpen(false);
      const draft = getLinkDraftFromSelection(el);
      setLinkDraft({ title: draft.title, href: draft.href });
      setLinkOpen(true);
      hideFloatingToolbar(true);
      closeMentionSuggest(true);
      return;
    }

    setFrameOpen(false);
    restoreSelection();
    el.focus({ preventScroll: true });
    applyFormatCommand(/** @type {'bold' | 'italic' | 'underline'} */ (command));

    skipNextSync.current = true;
    syncEmptyAndValue();
    refreshActive();
    requestAnimationFrame(updateSelectionToolbar);
  };

  const handleApplyLink = ({ title, href }) => {
    const el = editorRef.current;
    if (!el) return;
    const range = savedRangeRef.current;
    setLinkOpen(false);
    hideFloatingToolbar(true);
    requestAnimationFrame(() => {
      applyHyperlink({ title, href }, el, range);
      skipNextSync.current = true;
      syncEmptyAndValue();
      refreshActive();
    });
  };

  const handleApplyFrame = (hex) => {
    const el = editorRef.current;
    if (!el) return;
    const color = normalizeHexColor(hex) || frameColor;
    restoreSelection();
    applyAnimFrame(color, el);
    ensureFrameCarets(el);
    setFrameColor(color);
    setFrameOpen(false);
    hideFloatingToolbar(true);
    skipNextSync.current = true;
    syncEmptyAndValue();
  };

  const handleEditorMouseDown = (event) => {
    const el = editorRef.current;
    if (!el || !(event.target instanceof Element)) return;

    const removeBtn = event.target.closest(`.${MENTION_REMOVE_CLASS}`);
    if (removeBtn && el.contains(removeBtn)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.target.closest(`.${FRAME_CLASS} .post-anim-frame__text`)) return;

    const chips = Array.from(el.querySelectorAll(`.${FRAME_CLASS}, .${MENTION_CLASS}`));
    if (chips.length === 0) return;

    /** @type {HTMLElement | null} */
    let afterChip = null;
    const clickedChip = event.target.closest(`.${FRAME_CLASS}, .${MENTION_CLASS}`);

    if (clickedChip && el.contains(clickedChip)) {
      const rect = clickedChip.getBoundingClientRect();
      if (event.clientX >= rect.left + rect.width * 0.65) {
        afterChip = /** @type {HTMLElement} */ (clickedChip);
      }
    } else if (event.target === el) {
      const last = /** @type {HTMLElement} */ (chips[chips.length - 1]);
      const rect = last.getBoundingClientRect();
      if (event.clientX >= rect.right - 4) {
        afterChip = last;
      }
    }

    if (!afterChip) return;

    event.preventDefault();
    el.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStartAfter(afterChip);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
    hideFloatingToolbar(true);
    updateMentionCaretProximity(el);
  };

  const handleMentionRemoveClick = (event) => {
    const el = editorRef.current;
    if (!el || !(event.target instanceof Element)) return false;
    const removeBtn = event.target.closest(`.${MENTION_REMOVE_CLASS}`);
    if (!removeBtn || !el.contains(removeBtn)) return false;
    event.preventDefault();
    event.stopPropagation();
    const mention = removeBtn.closest(`.${MENTION_CLASS}`);
    if (!(mention instanceof HTMLElement) || !el.contains(mention)) return true;
    if (mention.dataset.removing === '1') return true;
    mention.dataset.removing = '1';

    const finish = () => {
      if (!el.contains(mention)) return;
      removeMentionEl(el, mention, 'before');
      closeMentionSuggest(true);
      skipNextSync.current = true;
      syncEmptyAndValue();
      updateMentionCaretProximity(el);
      el.focus({ preventScroll: true });
    };

    if (prefersReducedMotion()) {
      finish();
      return true;
    }

    gsap.to(mention, {
      opacity: 0,
      scale: 0.86,
      duration: 0.16,
      ease: 'power2.in',
      transformOrigin: '50% 50%',
      onComplete: finish
    });
    return true;
  };

  const mentionItemCount =
    mentionKind === 'user' ? mentionUsers.length : mentionPosts.length;

  const floatingToolbar =
    floatingMounted && floatingPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={floatingRef}
            className="post-format-toolbar-floating"
            style={{ top: floatingPos.top, left: floatingPos.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <PostFormatToolbar
              active={active}
              frameOpen={frameOpen}
              enableFrame={enableFrame}
              enableEmoji={emojiEnabled}
              enableMentions={enableMentions}
              emojiOpen={emojiOpen && emojiMode !== 'field'}
              onCommand={handleCommand}
            />
            {enableFrame && frameOpen ? (
              <FrameColorPicker
                color={frameColor}
                onChange={setFrameColor}
                onApply={handleApplyFrame}
                onClose={() => setFrameOpen(false)}
              />
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={clsx(
        'post-rich-text',
        compact && 'post-rich-text--compact',
        singleLine && 'post-rich-text--single-line',
        revealToolbarOnFocus && 'post-rich-text--reveal-toolbar',
        editorEnd && 'post-rich-text--with-editor-end',
        emojiEnabled && 'post-rich-text--emoji-enabled'
      )}
      ref={rootRef}
    >
      <div
        className={clsx(
          'post-rich-text__toolbar-row',
          revealToolbarOnFocus && 'post-rich-text__toolbar-row--reveal',
          showTopToolbar && 'is-visible'
        )}
        aria-hidden={revealToolbarOnFocus && !showTopToolbar ? true : undefined}
      >
        <PostFormatToolbar
          active={active}
          frameOpen={frameOpen}
          enableFrame={enableFrame}
          enableEmoji={emojiEnabled}
          enableMentions={enableMentions}
          emojiOpen={emojiOpen}
          trailing={toolbarExtra}
          onCommand={handleCommand}
        />
        {enableFrame && frameOpen && !floatingOpen ? (
          <FrameColorPicker
            color={frameColor}
            onChange={setFrameColor}
            onApply={handleApplyFrame}
            onClose={() => setFrameOpen(false)}
          />
        ) : null}
      </div>

      <div className="post-rich-text__editor-wrap">
        {emojiEnabled ? (
          <button
            ref={fieldEmojiBtnRef}
            type="button"
            className={clsx(
              'post-rich-text__emoji-field-btn',
              fieldEmojiVisible && 'is-visible'
            )}
            aria-label="Эмодзи"
            aria-hidden={!fieldEmojiVisible}
            tabIndex={fieldEmojiVisible ? 0 : -1}
            data-emoji-trigger="true"
            data-emoji-source="field"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              openEmojiPicker('field', e.currentTarget);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="9" cy="10" r="1.15" fill="currentColor" />
              <circle cx="15" cy="10" r="1.15" fill="currentColor" />
              <path
                d="M8.5 14.2c1.1 1.3 2.2 1.9 3.5 1.9s2.4-.6 3.5-1.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        <div
          id={id}
          ref={editorRef}
          className="post-rich-text__editor"
          contentEditable
          role="textbox"
          aria-multiline={!singleLine}
          aria-label={ariaLabel}
          data-placeholder={placeholder}
          data-empty={empty ? 'true' : 'false'}
          autoCapitalize="none"
          suppressContentEditableWarning
          onFocus={() => {
            setFocused(true);
            refreshActive();
            onFocus?.();
          }}
          onMouseDown={handleEditorMouseDown}
          onClick={(event) => {
            if (handleMentionRemoveClick(event)) return;
            const link = event.target instanceof Element ? event.target.closest('a') : null;
            if (link && editorRef.current?.contains(link)) {
              event.preventDefault();
            }
            const el = editorRef.current;
            const mention =
              event.target instanceof Element ? event.target.closest(`.${MENTION_CLASS}`) : null;
            if (mention && el?.contains(mention)) {
              event.preventDefault();
              // Клик по чипу → каретка сразу после → × видна («вплотную»).
              el.focus({ preventScroll: true });
              const selection = window.getSelection();
              if (selection) {
                const range = document.createRange();
                range.setStartAfter(mention);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                savedRangeRef.current = range.cloneRange();
              }
              updateMentionCaretProximity(el);
            }
          }}
          onKeyDown={(event) => {
            if (mentionOpen) {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeMentionSuggest();
                return;
              }
              if (event.key === 'ArrowDown' && mentionItemCount > 0) {
                event.preventDefault();
                setMentionActiveIndex((i) => (i + 1) % mentionItemCount);
                return;
              }
              if (event.key === 'ArrowUp' && mentionItemCount > 0) {
                event.preventDefault();
                setMentionActiveIndex((i) => (i - 1 + mentionItemCount) % mentionItemCount);
                return;
              }
              if ((event.key === 'Enter' || event.key === 'Tab') && mentionItemCount > 0) {
                event.preventDefault();
                if (mentionKind === 'user') {
                  applyMentionUser(mentionUsers[mentionActiveIndex]);
                } else {
                  applyMentionPost(mentionPosts[mentionActiveIndex]);
                }
                return;
              }
            }
            // Backspace/Delete mention — capture listener (см. useEffect выше).
            if (singleLine && event.key === 'Enter') {
              event.preventDefault();
            }
          }}
          onBlur={() => {
            requestAnimationFrame(() => {
              const el = editorRef.current;
              if (!el) return;
              const root = rootRef.current;
              const floating = floatingRef.current;
              const mentionPopup = document.querySelector('.mention-suggest');
              const activeEl = document.activeElement;
              if (root && activeEl && root.contains(activeEl)) return;
              if (floating && activeEl && floating.contains(activeEl)) return;
              if (mentionPopup && activeEl && mentionPopup.contains(activeEl)) return;
              if (!(valueRef.current || '')) {
                if (!isEditorEmpty(el)) clearEditorDom();
                hideFloatingToolbar(true);
                closeMentionSuggest(true);
                setFrameOpen(false);
                setFocused(false);
                return;
              }
              syncEmptyAndValue();
              hideFloatingToolbar(true);
              closeMentionSuggest();
              setFrameOpen(false);
              setFocused(false);
            });
          }}
          onInput={() => {
            const el = editorRef.current;
            if (el && !(valueRef.current || '') && lastClearedHtmlRef.current) {
              const html = getEditorHtml(el);
              if (html === lastClearedHtmlRef.current) {
                clearEditorDom();
                return;
              }
            }
            lastClearedHtmlRef.current = null;
            skipNextSync.current = true;
            syncEmptyAndValue();
            refreshActive();
            updateSelectionToolbar();
            if (enableMentions) updateMentionSuggest();
          }}
          onKeyUp={refreshActive}
          onMouseUp={() => {
            refreshActive();
            updateSelectionToolbar();
          }}
        />
        {editorEnd ? <div className="post-rich-text__editor-end">{editorEnd}</div> : null}
      </div>

      {floatingToolbar}

      {enableMentions ? (
        <MentionSuggestPopup
          open={mentionOpen}
          mounted={mentionMounted}
          kind={mentionKind}
          query={mentionQuery}
          loading={mentionLoading}
          users={mentionUsers}
          posts={mentionPosts}
          activeIndex={mentionActiveIndex}
          anchorRect={mentionAnchor}
          placementMode="toolbar-above"
          onHoverIndex={setMentionActiveIndex}
          onSelectUser={applyMentionUser}
          onSelectPost={applyMentionPost}
          onClose={() => closeMentionSuggest()}
          onExitComplete={() => {
            setMentionMounted(false);
            setMentionAnchor(null);
            setMentionUsers([]);
            setMentionPosts([]);
            setMentionLoading(false);
          }}
        />
      ) : null}

      <PostLinkModal
        isOpen={linkOpen}
        initialTitle={linkDraft.title}
        initialHref={linkDraft.href}
        onClose={() => setLinkOpen(false)}
        onSubmit={handleApplyLink}
      />

      <EmojiPicker
        open={emojiOpen && emojiEnabled}
        mode={emojiMode}
        top={emojiLayout?.top ?? null}
        bottom={emojiLayout?.bottom ?? null}
        left={emojiLayout?.left ?? null}
        width={emojiLayout?.width ?? null}
        height={emojiLayout?.height ?? null}
        onClose={() => {
          setEmojiOpen(false);
          setEmojiLayout(null);
        }}
        shouldIgnoreClose={(target) => {
          if (!(target instanceof Element)) return false;
          if (target.closest('.post-rich-text__editor')) return true;
          if (editorRef.current?.contains(target)) return true;
          return false;
        }}
        onPick={(emoji) => {
          insertEmojiAtCaret(emoji);
        }}
        onBackspace={deleteEmojiBackspace}
      />
    </div>
  );
});

export default PostRichTextField;
