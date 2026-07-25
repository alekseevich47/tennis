import React, { memo } from 'react';
import PostContentHtml from './PostContentHtml';

/**
 * @param {{ comments: Array<{ id: string, text: string, expand?: any }> }} props
 */
function CommentsPreview({ comments }) {
  if (!comments || comments.length === 0) return null;
  return (
    <div className="feed-comments-preview">
      {comments.map((c) => (
        <div key={c.id} className="preview-comment-row">
          <span className="preview-comment-author">{c.expand?.author?.full_name || 'Игрок'}:</span>{' '}
          <PostContentHtml as="span" className="preview-comment-text" content={c.text} />
        </div>
      ))}
    </div>
  );
}

export default memo(CommentsPreview);
