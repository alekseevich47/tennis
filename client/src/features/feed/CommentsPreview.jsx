import React, { memo } from 'react';
import paperClipUrl from '../../assets/paper-clip.svg';
import PostContentHtml from './PostContentHtml';
import { MENTION_POST_CLASS } from './postMentions';
import { hasVisibleText } from './postRichText';
import { mediaNames } from '../../lib/media';

/**
 * @param {{ text?: string, media?: string | string[] }} comment
 */
function commentHasAttachments(comment) {
  if (mediaNames(comment?.media).length > 0) return true;
  const text = String(comment?.text || '');
  if (!text) return false;
  return text.includes(MENTION_POST_CLASS) || text.includes('post-mention--post');
}

/**
 * @param {{ comments: Array<{ id: string, text: string, media?: string | string[], expand?: any }> }} props
 */
function CommentsPreview({ comments }) {
  if (!comments || comments.length === 0) return null;
  return (
    <div className="feed-comments-preview">
      {comments.map((c) => {
        const hasAttachments = commentHasAttachments(c);
        const hasText = hasVisibleText(c.text);
        return (
          <div key={c.id} className="preview-comment-row">
            <div className="preview-comment-row__head">
              <span className="preview-comment-author">{c.expand?.author?.full_name || 'Игрок'}:</span>
              {hasAttachments ? (
                <span className="preview-comment-attachments">
                  <img
                    src={paperClipUrl}
                    alt=""
                    className="preview-comment-attachments__icon"
                    width="14"
                    height="14"
                    aria-hidden="true"
                    draggable={false}
                  />
                  <span className="preview-comment-attachments__label">Вложения</span>
                </span>
              ) : null}
            </div>
            {hasText ? (
              <PostContentHtml
                as="span"
                className="preview-comment-text"
                content={c.text}
                disableMentions
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default memo(CommentsPreview);
