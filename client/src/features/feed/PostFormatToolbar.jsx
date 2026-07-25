import React from 'react';
import clsx from 'clsx';

/**
 * @param {{
 *   variant: 'floating' | 'permanent',
 *   active?: { bold?: boolean, italic?: boolean, underline?: boolean },
 *   onCommand: (command: 'bold' | 'italic' | 'underline' | 'link') => void
 * }} props
 */
function PostFormatToolbar({ variant, active = {}, onCommand }) {
  const run = (command) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCommand(command);
  };

  return (
    <div
      className={clsx(
        'post-format-toolbar',
        variant === 'floating' ? 'post-format-toolbar--floating' : 'post-format-toolbar--permanent'
      )}
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
    </div>
  );
}

export default PostFormatToolbar;
