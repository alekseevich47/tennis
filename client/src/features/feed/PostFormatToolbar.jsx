import React from 'react';
import clsx from 'clsx';

/**
 * @param {{
 *   active?: { bold?: boolean, italic?: boolean, underline?: boolean, link?: boolean },
 *   frameOpen?: boolean,
 *   enableFrame?: boolean,
 *   enableEmoji?: boolean,
 *   emojiOpen?: boolean,
 *   trailing?: React.ReactNode,
 *   onCommand: (command: 'bold' | 'italic' | 'underline' | 'frame' | 'link' | 'emoji') => void
 * }} props
 */
function PostFormatToolbar({
  active = {},
  frameOpen = false,
  enableFrame = true,
  enableEmoji = true,
  emojiOpen = false,
  trailing = null,
  onCommand
}) {
  const run = (command) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCommand(command);
  };

  return (
    <div
      className="post-format-toolbar post-format-toolbar--permanent"
      role="toolbar"
      aria-label="Форматирование текста"
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className={clsx('post-format-toolbar__btn', active.bold && 'is-active')}
        aria-label="Жирный"
        aria-pressed={Boolean(active.bold)}
        onClick={run('bold')}
      >
        <span className="post-format-toolbar__glyph post-format-toolbar__glyph--bold" aria-hidden="true">
          Ж
        </span>
      </button>
      <button
        type="button"
        className={clsx('post-format-toolbar__btn', active.italic && 'is-active')}
        aria-label="Курсив"
        aria-pressed={Boolean(active.italic)}
        onClick={run('italic')}
      >
        <span className="post-format-toolbar__glyph post-format-toolbar__glyph--italic" aria-hidden="true">
          К
        </span>
      </button>
      <button
        type="button"
        className={clsx('post-format-toolbar__btn', active.underline && 'is-active')}
        aria-label="Подчёркнутый"
        aria-pressed={Boolean(active.underline)}
        onClick={run('underline')}
      >
        <span className="post-format-toolbar__glyph post-format-toolbar__glyph--underline" aria-hidden="true">
          Ч
        </span>
      </button>
      {enableEmoji ? (
        <button
          type="button"
          className={clsx(
            'post-format-toolbar__btn',
            'post-format-toolbar__btn--emoji',
            emojiOpen && 'is-active'
          )}
          aria-label="Эмодзи"
          aria-pressed={Boolean(emojiOpen)}
          data-emoji-trigger="true"
          data-emoji-source="toolbar"
          onClick={run('emoji')}
        >
          <svg className="post-format-toolbar__icon" viewBox="0 0 24 24" aria-hidden="true">
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
      <button
        type="button"
        className={clsx('post-format-toolbar__btn', active.link && 'is-active')}
        aria-label="Ссылка"
        aria-pressed={Boolean(active.link)}
        onClick={run('link')}
      >
        <svg className="post-format-toolbar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <ellipse
            cx="12"
            cy="12"
            rx="4"
            ry="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M3.5 9.5h17M3.5 14.5h17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {enableFrame ? (
        <>
          <span className="post-format-toolbar__sep" aria-hidden="true" />
          <button
            type="button"
            className={clsx('post-format-toolbar__btn', frameOpen && 'is-active')}
            aria-label="Анимационная рамка"
            aria-pressed={frameOpen}
            onClick={run('frame')}
          >
            <svg className="post-format-toolbar__icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="4.5"
                y="6.5"
                width="15"
                height="11"
                rx="3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8 12h8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </>
      ) : null}
      {trailing}
    </div>
  );
}

export default PostFormatToolbar;
