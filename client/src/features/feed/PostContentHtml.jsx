import React from 'react';
import { toDisplayHtml } from './postRichText';

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

  if (as === 'button') {
    return (
      <button
        type={type}
        className={className}
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: html }}
        {...rest}
      />
    );
  }

  return (
    <Tag
      className={className}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
      {...rest}
    />
  );
}

export default PostContentHtml;
