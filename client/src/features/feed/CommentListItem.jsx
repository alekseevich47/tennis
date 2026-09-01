import React, { useCallback, useMemo, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import CommentReplyButton from './CommentReplyButton';
import CommentReplyQuote from './CommentReplyQuote';
import CommentSwipeReply from './CommentSwipeReply';
import CommentContextMenu from './CommentContextMenu';
import { formatCommentTime } from '../../lib/format';
import { LongPressRing, useLongPress } from '../../lib/longPress';
import { useCommentTapCopy } from './useCommentTapCopy';
import { useToast } from '../../components/ui/ToastContext';

/**
 * Пузырёк комментария в стиле мессенджера (Telegram-like).
 * @param {{
 *   comment: any,
 *   isOwner: boolean,
 *   userIsModerator?: boolean,
 *   isHighlighted?: boolean,
 *   isEditing?: boolean,
 *   swipeEnabled?: boolean,
 *   canReply?: boolean,
 *   canDelete?: boolean,
 *   canEdit?: boolean,
 *   likeCount?: number,
 *   isLiked?: boolean,
 *   parentComment?: any,
 *   userId?: string,
 *   className?: string,
 *   onReply?: () => void,
 *   onToggleLike?: () => void,
 *   onStartEdit?: () => void,
 *   onDelete?: () => void,
 *   onOpenProfile?: (user: any) => void,
 *   onFocusParent?: () => void,
 *   innerRef?: (node: HTMLElement | null) => void,
 *   editForm?: React.ReactNode,
 *   children?: React.ReactNode
 * }} props
 */
function CommentListItem({
  comment,
  isOwner,
  userIsModerator = false,
  isHighlighted = false,
  isEditing = false,
  swipeEnabled = true,
  canReply = true,
  canDelete = false,
  canEdit = false,
  likeCount = 0,
  isLiked = false,
  parentComment = null,
  userId = null,
  className = '',
  onReply,
  onToggleLike,
  onStartEdit,
  onDelete,
  onOpenProfile,
  onFocusParent,
  innerRef,
  editForm = null,
  children
}) {
  const { showToast } = useToast();
  const [menuAnchor, setMenuAnchor] = useState(/** @type {{ x: number, y: number } | null} */ (null));
  const longPressEnabled = !isEditing && (canEdit || canDelete);

  const tapCopy = useCommentTapCopy({
    enabled: !isEditing,
    text: comment?.text || '',
    onCopied: () => showToast({ text: 'Текст скопирован' })
  });

  const handleLongPress = useCallback((point) => {
    tapCopy.suppressNextTap();
    setMenuAnchor(point);
  }, [tapCopy]);

  const { handlers: longPressHandlers, cardStyle, ringProps } = useLongPress({
    enabled: longPressEnabled,
    onLongPress: handleLongPress
  });

  const layoutLongPressHandlers = useMemo(() => {
    if (!longPressEnabled) return {};
    return {
      onPointerDownCapture: longPressHandlers.onPointerDown,
      onPointerMoveCapture: longPressHandlers.onPointerMove,
      onPointerUpCapture: longPressHandlers.onPointerUp,
      onPointerCancelCapture: longPressHandlers.onPointerCancel,
      onContextMenuCapture: longPressHandlers.onContextMenu
    };
  }, [longPressEnabled, longPressHandlers]);

  const bubbleHandlers = useMemo(() => {
    const mergeClick = (longHandler, tapHandler) => (/** @type {any} */ event) => {
      longHandler?.(event);
      if (!isEditing) tapHandler?.(event);
    };

    return {
      onPointerDown: !isEditing ? tapCopy.handlers.onPointerDown : undefined,
      onPointerMove: !isEditing ? tapCopy.handlers.onPointerMove : undefined,
      onPointerUp: !isEditing ? tapCopy.handlers.onPointerUp : undefined,
      onPointerCancel: !isEditing ? tapCopy.handlers.onPointerCancel : undefined,
      onClick: mergeClick(longPressHandlers.onClick, tapCopy.handlers.onClick)
    };
  }, [isEditing, longPressHandlers.onClick, tapCopy.handlers]);

  const author = comment.expand?.author;
  const authorName = author?.full_name || 'Игрок секции';
  const bubbleVariant = isOwner ? 'own' : 'other';
  const rowClass = [
    'comment-row',
    isOwner ? 'comment-row--own' : 'comment-row--other',
    isHighlighted ? 'comment-row--highlight' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <CommentSwipeReply
        className={rowClass}
        enabled={swipeEnabled && !isEditing && !menuAnchor}
        onReply={onReply}
        innerRef={innerRef}
      >
        <div
          className="comment-row__layout"
          style={longPressEnabled ? cardStyle : undefined}
          {...layoutLongPressHandlers}
        >
          {!isOwner ? (
            <button
              type="button"
              className="comment-row__avatar comment-author-profile-link"
              onClick={() => onOpenProfile?.(author)}
              aria-label={`Открыть профиль ${authorName}`}
            >
              <Avatar user={author} size="sm" />
            </button>
          ) : null}

          <div
            className={`comment-bubble comment-bubble--${bubbleVariant}${menuAnchor ? ' comment-bubble--menu-open' : ''}`}
            {...(!isEditing ? bubbleHandlers : {})}
          >
            {isEditing ? (
              editForm
            ) : (
              <>
                {parentComment ? (
                  <CommentReplyQuote
                    author={parentComment.expand?.author || null}
                    text={parentComment.text}
                    variant={bubbleVariant}
                    inBubble
                    onOpenProfile={onOpenProfile}
                    onActivate={onFocusParent}
                  />
                ) : null}

                {!isOwner ? (
                  <button
                    type="button"
                    className="comment-bubble__author"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenProfile?.(author);
                    }}
                  >
                    {authorName}
                  </button>
                ) : null}

                <div
                  className="comment-bubble__body"
                  onClickCapture={(event) => {
                    if (!menuAnchor) return;
                    if (event.target instanceof Element && event.target.closest('.comment-media-grid')) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                  {children}
                </div>

                <div className="comment-bubble__meta">
                  <div className="comment-footer-actions">
                    <button
                      type="button"
                      className={`comment-like-btn${isLiked ? ' comment-like-btn--active' : ''}`}
                      onClick={onToggleLike}
                      disabled={!userId}
                      aria-label={isLiked ? 'Убрать лайк' : 'Поставить лайк'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      {likeCount > 0 ? (
                        <span className="comment-like-count">{likeCount}</span>
                      ) : null}
                    </button>
                    {canReply ? <CommentReplyButton onClick={onReply} /> : null}
                  </div>
                  <time className="comment-bubble__time" dateTime={comment.created}>
                    {formatCommentTime(comment.created)}
                  </time>
                </div>
              </>
            )}
          </div>
        </div>
      </CommentSwipeReply>

      {longPressEnabled ? <LongPressRing {...ringProps} /> : null}

      <CommentContextMenu
        isOpen={Boolean(menuAnchor)}
        anchorPoint={menuAnchor}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={onStartEdit}
        onDelete={onDelete}
        onClose={() => setMenuAnchor(null)}
      />
    </>
  );
}

export default CommentListItem;
