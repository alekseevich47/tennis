import React, { useEffect, useRef } from 'react';
import { startAnimFrames, toDisplayHtml } from './postRichText';

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

  if (as === 'button') {
    return (
      <button
        ref={/** @type {any} */ (ref)}
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
      ref={/** @type {any} */ (ref)}
      className={className}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
      {...rest}
    />
  );
}

export default PostContentHtml;
