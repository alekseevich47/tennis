import React, { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import gsap from 'gsap';
import Avatar from '../../components/ui/Avatar';
import { registerOverlay } from '../../lib/overlayStack';

const ENTER_MS = 0.22;
const EXIT_MS = 0.16;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {{
 *   open: boolean,
 *   mounted: boolean,
 *   kind: 'user' | 'post',
 *   query: string,
 *   loading: boolean,
 *   users?: Array<{ id: string, full_name?: string, avatar?: any, avatar_url?: string }>,
 *   posts?: Array<{ id: string, post_number: number, source: 'feed' | 'tournament', preview?: string }>,
 *   activeIndex: number,
 *   anchorRect: { top: number, left: number, bottom: number, width: number } | null,
 *   onHoverIndex: (index: number) => void,
 *   onSelectUser: (user: any) => void,
 *   onSelectPost: (post: any) => void,
 *   onClose: () => void,
 *   onExitComplete: () => void
 * }} props
 */
function MentionSuggestPopup({
  open,
  mounted,
  kind,
  query,
  loading,
  users = [],
  posts = [],
  activeIndex,
  anchorRect,
  onHoverIndex,
  onSelectUser,
  onSelectPost,
  onClose,
  onExitComplete
}) {
  const listId = useId();
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!open) return undefined;
    return registerOverlay(`mention-suggest:${listId}`, onClose);
  }, [open, listId, onClose]);

  useLayoutEffect(() => {
    if (!mounted) return undefined;
    const el = rootRef.current;
    if (!el) return undefined;

    gsap.killTweensOf(el);
    const reduced = prefersReducedMotion();

    if (open) {
      gsap.fromTo(
        el,
        { opacity: 0, y: 8, scale: 0.96, pointerEvents: 'none' },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          pointerEvents: 'auto',
          duration: reduced ? 0.01 : ENTER_MS,
          ease: 'power3.out'
        }
      );
      return () => {
        gsap.killTweensOf(el);
      };
    }

    const tween = gsap.to(el, {
      opacity: 0,
      y: 6,
      scale: 0.97,
      pointerEvents: 'none',
      duration: reduced ? 0.01 : EXIT_MS,
      ease: 'power2.in',
      onComplete: () => {
        if (openRef.current) return;
        onExitComplete();
      }
    });
    return () => {
      tween.kill();
    };
  }, [open, mounted, onExitComplete]);

  if (!mounted || !anchorRect || typeof document === 'undefined') return null;

  const items = kind === 'user' ? users : posts;
  const panelWidth = Math.min(320, Math.max(220, window.innerWidth - 16));
  let left = Math.min(
    Math.max(8, anchorRect.left),
    window.innerWidth - panelWidth - 8
  );
  // Сверху от каретки / поля.
  const estimatedHeight = Math.min(280, 48 + items.length * 44);
  let top = anchorRect.top - estimatedHeight - 8;
  if (top < 8) {
    top = Math.min(window.innerHeight - estimatedHeight - 8, anchorRect.bottom + 8);
  }

  let body;
  if (loading) {
    body = <div className="mention-suggest__empty">Поиск…</div>;
  } else if (kind === 'user' && users.length === 0) {
    body = (
      <div className="mention-suggest__empty">
        {query ? 'Участник не найден' : 'Начните вводить имя'}
      </div>
    );
  } else if (kind === 'post' && posts.length === 0) {
    body = (
      <div className="mention-suggest__empty">
        {query ? 'Публикация не найдена' : 'Введите номер, например @#12'}
      </div>
    );
  } else if (kind === 'user') {
    body = users.map((user, index) => (
      <button
        key={user.id}
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        className={clsx('mention-suggest__item', index === activeIndex && 'is-active')}
        onMouseEnter={() => onHoverIndex(index)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelectUser(user)}
      >
        <Avatar user={user} size="sm" className="mention-suggest__avatar" />
        <span className="mention-suggest__name">{user.full_name || 'Участник'}</span>
      </button>
    ));
  } else {
    body = posts.map((post, index) => {
      const sourceLabel = post.source === 'tournament' ? 'Турнир' : 'Лента';
      return (
        <button
          key={`${post.source}:${post.id}`}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={clsx('mention-suggest__item', index === activeIndex && 'is-active')}
          onMouseEnter={() => onHoverIndex(index)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelectPost(post)}
        >
          <span className="mention-suggest__doc-icon" aria-hidden="true">
            <span className="post-mention__doc-line" />
            <span className="post-mention__doc-line" />
            <span className="post-mention__doc-line" />
          </span>
          <span className="mention-suggest__post-meta">
            <span className="mention-suggest__post-title">
              #{post.post_number}
              <span className={clsx(
                'mention-suggest__badge',
                post.source === 'tournament' && 'mention-suggest__badge--tournament'
              )}
              >
                {sourceLabel}
              </span>
            </span>
            {post.preview ? (
              <span className="mention-suggest__preview">{post.preview}</span>
            ) : null}
          </span>
        </button>
      );
    });
  }

  return createPortal(
    <div
      ref={rootRef}
      id={listId}
      className="mention-suggest"
      style={{ top, left, width: panelWidth }}
      role="listbox"
      aria-label={kind === 'user' ? 'Упоминание участника' : 'Упоминание публикации'}
    >
      <div className="mention-suggest__hint">
        {kind === 'user' ? '@ участник' : '@# публикация'}
      </div>
      <div className="mention-suggest__list">{body}</div>
    </div>,
    document.body
  );
}

export default MentionSuggestPopup;
