import React, { useEffect, useRef } from 'react';
import { startAnimFrames, toDisplayHtml } from './postRichText';
import { MENTION_CLASS } from './postMentions';
import { applyMentionMissingStatuses, MENTION_MISSING_CLASS } from './mentionStatus';
import { handleContentCopy } from './copyPlainText';
import { useMentionNav } from '../../context/MentionNavContext';
import { usePlayers } from '../../hooks/usePlayers';

/**
 * @param {{
 *   content?: string | null,
 *   className?: string,
 *   as?: 'div' | 'p' | 'span' | 'button',
 *   onClick?: (e: React.MouseEvent) => void,
 *   type?: 'button' | 'submit' | 'reset'
 * } & Record<string, unknown>} props
 */
function PostContentHtml({ content, className, as = 'div', onClick, type = 'button', ...rest }) {
  const html = toDisplayHtml(content || '');
  const Tag = as;
  const ref = useRef(/** @type {HTMLElement | null} */ (null));
  const mentionNav = useMentionNav();
  const { data: players } = usePlayers();

  useEffect(() => {
    let stop = () => {};
    const raf = requestAnimationFrame(() => {
      stop = startAnimFrames(ref.current);
    });
    return () => {
      cancelAnimationFrame(raf);
      stop();
    };
  }, [html]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await applyMentionMissingStatuses(ref.current, { players });
      if (cancelled) return;
    };
    const raf = requestAnimationFrame(() => {
      run();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [html, players]);

  /**
   * @param {React.MouseEvent} e
   */
  const handleClick = (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const mention = target?.closest?.(`.${MENTION_CLASS}`);
    if (mention && ref.current?.contains(mention)) {
      e.preventDefault();
      e.stopPropagation();
      if (mention.classList.contains(MENTION_MISSING_CLASS)) {
        return;
      }
      const kind = mention.getAttribute('data-mention');
      if (kind === 'user') {
        const id = mention.getAttribute('data-user-id') || '';
        const name = mention.getAttribute('data-name') || '';
        const avatar = mention.getAttribute('data-avatar') || '';
        if (id) {
          mentionNav?.openUserProfile({
            id,
            full_name: name,
            ...(avatar ? { avatar_url: avatar } : {})
          });
        }
        return;
      }
      if (kind === 'post') {
        const postId = mention.getAttribute('data-post-id') || '';
        const sourceRaw = mention.getAttribute('data-post-source') || 'feed';
        const source = sourceRaw === 'tournament' ? 'tournament' : 'feed';
        if (postId) {
          mentionNav?.openPostMention({ source, postId });
        }
        return;
      }
    }
    onClick?.(e);
  };

  if (as === 'button') {
    return (
      <button
        ref={/** @type {any} */ (ref)}
        type={type}
        className={className}
        onClick={handleClick}
        onCopy={(e) => handleContentCopy(e.nativeEvent, ref.current)}
        dangerouslySetInnerHTML={{ __html: html }}
        {...rest}
      />
    );
  }

  return (
    <Tag
      ref={/** @type {any} */ (ref)}
      className={className}
      onClick={handleClick}
      onCopy={(e) => handleContentCopy(e.nativeEvent, ref.current)}
      dangerouslySetInnerHTML={{ __html: html }}
      {...rest}
    />
  );
}

export default PostContentHtml;
