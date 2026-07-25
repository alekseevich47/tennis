import React from 'react';
import clsx from 'clsx';

/**
 * @param {{
 *   active?: { bold?: boolean, italic?: boolean, underline?: boolean },
 *   frameOpen?: boolean,
 *   onCommand: (command: 'bold' | 'italic' | 'underline' | 'link' | 'frame') => void
 * }} props
 */
function PostFormatToolbar({ active = {}, frameOpen = false, onCommand }) {
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
      <span className="post-format-toolbar__sep" aria-hidden="true" />
      <button
        type="button"
        className="post-format-toolbar__btn"
        aria-label="Ссылка"
        onClick={run('link')}
      >
        <svg className="post-format-toolbar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 7.07 7.07L14 18.07"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
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
    </div>
  );
}

export default PostFormatToolbar;
