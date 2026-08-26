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
import {
  FRAME_CLASS,
  applyAnimFrame,
  applyFormatCommand,
  applyHyperlink,
  ensureFrameCarets,
  getEditorHtml,
  getLinkDraftFromSelection,
  isEditorEmpty,
  normalizeHexColor,
  readActiveFormats
} from './postRichText';
import {
  MENTION_CLASS,
  buildPostMentionEl,
  buildUserMentionEl,
  getMentionDraftAtCaret,
  insertMentionChip,
  searchMentionPosts,
  searchMentionUsers
} from './postMentions';

const FLOATING_ENTER_MS = 0.28;
const FLOATING_EXIT_MS = 0.2;
const MENTION_DEBOUNCE_MS = 160;

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
  const mentionTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
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
    if (mentionTimerRef.current) {
      clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = null;
    }
    if (mentionAbortRef.current) {
      mentionAbortRef.current.abort();
      mentionAbortRef.current = null;
    }
    mentionDraftRef.current = null;
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
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
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

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        const el = editorRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      },
      clear: () => {
        const el = editorRef.current;
        lastClearedHtmlRef.current = el ? getEditorHtml(el) : '';
        valueRef.current = '';
        clearEditorDom();
        closeMentionSuggest(true);
      }
    }),
    [clearEditorDom, closeMentionSuggest]
  );

  const syncEmptyAndValue = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setEmpty(isEditorEmpty(el));
    onChange(getEditorHtml(el));
  }, [onChange]);

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
    setMentionKind(draft.kind);
    setMentionQuery(draft.query);
    setMentionActiveIndex(0);
    hideFloatingToolbar(true);

    try {
      const rect = draft.range.getBoundingClientRect();
      if (rect && (rect.width > 0 || rect.height > 0 || rect.top > 0)) {
        setMentionAnchor({
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          width: Math.max(rect.width, 8)
        });
      } else if (el) {
        const er = el.getBoundingClientRect();
        setMentionAnchor({
          top: er.top,
          left: er.left,
          bottom: er.top + 24,
          width: 8
        });
      }
    } catch {
      // ignore
    }

    setMentionMounted(true);
    setMentionOpen(true);

    if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
    mentionTimerRef.current = setTimeout(async () => {
      mentionTimerRef.current = null;
      if (mentionAbortRef.current) mentionAbortRef.current.abort();
      const ac = new AbortController();
      mentionAbortRef.current = ac;
      setMentionLoading(true);
      try {
        if (draft.kind === 'user') {
          const users = await searchMentionUsers(draft.query, { signal: ac.signal });
          if (ac.signal.aborted) return;
          setMentionUsers(users);
          setMentionPosts([]);
          setMentionActiveIndex(0);
        } else {
          const posts = await searchMentionPosts(draft.query, { signal: ac.signal });
          if (ac.signal.aborted) return;
          setMentionPosts(posts);
          setMentionUsers([]);
          setMentionActiveIndex(0);
        }
      } catch {
        if (ac.signal.aborted) return;
        setMentionUsers([]);
        setMentionPosts([]);
      } finally {
        if (!ac.signal.aborted) setMentionLoading(false);
      }
    }, MENTION_DEBOUNCE_MS);
  }, [closeMentionSuggest, enableMentions, hideFloatingToolbar]);

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
      if (getEditorHtml(el) === next || el.innerHTML === next) return;
    }
    if (el.innerHTML !== next) {
      el.innerHTML = next;
      ensureFrameCarets(el);
      setEmpty(isEditorEmpty(el));
    }
  }, [value]);

  useEffect(() => {
    const onSelectionChange = () => {
      const el = editorRef.current;
      if (!el) return;
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) {
        hideFloatingToolbar();
        return;
      }
      const node = sel.anchorNode;
      if (!node || !el.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node)) {
        hideFloatingToolbar();
        return;
      }
      saveSelection();
      refreshActive();
      updateSelectionToolbar();
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

  const handleCommand = (command) => {
    const el = editorRef.current;
    if (!el) return;

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
        editorEnd && 'post-rich-text--with-editor-end'
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
          suppressContentEditableWarning
          onFocus={() => {
            setFocused(true);
            refreshActive();
            onFocus?.();
          }}
          onMouseDown={handleEditorMouseDown}
          onClick={(event) => {
            const link = event.target instanceof Element ? event.target.closest('a') : null;
            if (link && editorRef.current?.contains(link)) {
              event.preventDefault();
            }
            const mention =
              event.target instanceof Element ? event.target.closest(`.${MENTION_CLASS}`) : null;
            if (mention && editorRef.current?.contains(mention)) {
              event.preventDefault();
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
    </div>
  );
});

export default PostRichTextField;
