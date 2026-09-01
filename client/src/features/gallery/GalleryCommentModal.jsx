import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import PostContentHtml from '../feed/PostContentHtml';
import PostRichTextField from '../feed/PostRichTextField';
import CommentSendButton from '../feed/CommentSendButton';
import CommentListItem from '../feed/CommentListItem';
import CommentListSkeleton from '../feed/CommentListSkeleton';
import CommentReplyComposeBar from '../feed/CommentReplyComposeBar';
import { groupCommentsByDay } from '../feed/commentListLayout';
import DayGroup from '../feed/DayGroup';
import { hasVisibleText, toDisplayHtml } from '../feed/postRichText';
import { useGalleryComments } from '../../hooks/useGalleryComments';
import { useCommentLikes } from '../../hooks/useCommentLikes';
import {
  createGalleryComment,
  deleteGalleryComment,
  updateGalleryComment
} from '../../services/catalog';
import { getMediaUrl, videoPreviewUrl } from '../../lib/media';
import { error } from '../../lib/log';
import { useKeepForModalClose } from '../../hooks/useKeepForModalClose';
import '../feed/Feed.css';

const COMMENT_COLLECTION = 'gallery_comments';
const SCROLL_INTO_VIEW_DELAY_MS = 200;
const HIGHLIGHT_MS = 2500;

/**
 * @param {{
 *   isOpen: boolean,
 *   mediaItem: any | null,
 *   user: any,
 *   userIsModerator: boolean,
 *   onClose: () => void,
 *   onOpenProfile?: (user: any) => void,
 *   highlightCommentId?: string | null
 * }} props
 */
function GalleryCommentModal({
  isOpen,
  mediaItem: mediaItemProp,
  user,
  userIsModerator,
  onClose,
  onOpenProfile,
  highlightCommentId = null
}) {
  const mediaItem = useKeepForModalClose(isOpen, mediaItemProp);
  const mediaId = mediaItem?.id || null;
  const { comments, mutate, isLoading, isPartial } = useGalleryComments(isOpen ? mediaId : null);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState(/** @type {any | null} */ (null));
  const [highlightedId, setHighlightedId] = useState(/** @type {string | null} */ (null));

  const commentItemRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const commentFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const isAddingCommentRef = useRef(false);
  const highlightClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const commentIds = useMemo(() => comments.map((c) => c.id), [comments]);

  const { countsByComment, userLikedSet, toggle: toggleLike } = useCommentLikes(
    isOpen ? commentIds : [],
    COMMENT_COLLECTION,
    user?.id
  );

  useEffect(() => {
    if (!isOpen) {
      setCommentText('');
      setIsAddingComment(false);
      setDeletingId(null);
      setEditingId(null);
      setEditText('');
      setReplyTo(null);
      setHighlightedId(null);
    }
  }, [isOpen, mediaId]);

  const focusCommentInList = (commentId, align = 'start') => {
    if (!commentId) return;
    setHighlightedId(commentId);
    if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    window.setTimeout(() => {
      commentItemRefs.current.get(commentId)?.scrollIntoView({
        behavior: 'smooth',
        block: align
      });
    }, SCROLL_INTO_VIEW_DELAY_MS);
    highlightClearRef.current = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
  };

  useEffect(() => {
    if (!isOpen || !highlightCommentId) return undefined;
    focusCommentInList(highlightCommentId, 'center');
    return () => {
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только внешний highlight
  }, [isOpen, highlightCommentId, comments.length]);

  if (!mediaItem) return null;

  const isVideo = mediaItem.media_type === 'video';
  const mediaFile = isVideo ? mediaItem.video : mediaItem.image;
  const mediaUrl = getMediaUrl(mediaItem, 'gallery', mediaFile);

  const handleReply = (comment) => {
    setReplyTo(comment);
    setEditingId(null);
    commentFieldRef.current?.focus();
    requestAnimationFrame(() => {
      commentFieldRef.current?.focus();
    });
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!hasVisibleText(commentText) || !mediaId || !user?.id || isAddingCommentRef.current) return;

    const text = commentText;
    const replyToId = replyTo?.id || null;
    isAddingCommentRef.current = true;
    setIsAddingComment(true);
    setCommentText('');
    setReplyTo(null);
    commentFieldRef.current?.clear();
    try {
      await createGalleryComment({
        mediaId,
        authorId: user.id,
        text,
        replyToId
      });
      await mutate();
    } catch (err) {
      error('add gallery comment:', err);
      setCommentText(text);
    } finally {
      isAddingCommentRef.current = false;
      setIsAddingComment(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!commentId || deletingId) return;

    setDeletingId(commentId);
    try {
      await deleteGalleryComment(commentId, mediaId);
      await mutate();
    } catch (err) {
      error('delete gallery comment:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(toDisplayHtml(comment.text || ''));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = async (event, commentId) => {
    event.preventDefault();
    if (!hasVisibleText(editText) || !commentId) return;

    try {
      await updateGalleryComment(commentId, editText, mediaId);
      setEditingId(null);
      setEditText('');
      await mutate();
    } catch (err) {
      error('update gallery comment:', err);
    }
  };

  const handleToggleLike = (commentId) => {
    if (!user?.id) return;
    toggleLike(commentId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Комментарии"
      ariaLabel="Комментарии к медиа галереи"
      size="large"
      className="gallery-comment-modal"
      footer={user?.id ? (
        user.can_comment === false ? (
          <div className="comment-restricted-message">
            Вы запрещено оставлять комментарии по причине:{' '}
            {user.comment_restriction_reason || 'не указана'}. Свяжитесь с администратором.
          </div>
        ) : (
          <div className="modal-comment-footer">
            <CommentReplyComposeBar comment={replyTo} onCancel={() => setReplyTo(null)} />
            <form className="gallery-comment-form" onSubmit={handleAdd}>
              <label htmlFor="gallery-comment-input" className="visually-hidden">
                Написать комментарий
              </label>
              <PostRichTextField
                ref={commentFieldRef}
                id="gallery-comment-input"
                value={commentText}
                onChange={setCommentText}
                enableFrame={false}
                compact
                placeholder="Написать комментарий..."
                aria-label="Написать комментарий"
              />
              <CommentSendButton
                disabled={isAddingComment || !hasVisibleText(commentText)}
                busy={isAddingComment}
              />
            </form>
          </div>
        )
      ) : null}
    >
      {mediaUrl && (
        <div className="gallery-comment-preview">
          {isVideo ? (
            <video src={videoPreviewUrl(mediaUrl)} controls preload="metadata" />
          ) : (
            <img src={mediaUrl} alt="Медиа из галереи" />
          )}
        </div>
      )}

      <div className="gallery-comments-section">
        {isLoading ? (
          <CommentListSkeleton count={4} />
        ) : comments.length === 0 ? (
          <p className="gallery-comments-empty">Комментариев пока нет.</p>
        ) : (
          <div className="gallery-comments-list modal-comments-list">
            {isPartial ? <CommentListSkeleton count={2} className="comment-list-skeleton--older" /> : null}
            {groupCommentsByDay(comments).map((group) => (
              <DayGroup key={group.dayKey} label={group.dateLabel} variant="comments">
                {group.items.map((comment) => {
                  const isAuthor = comment.author === user?.id;
                  const canReply = user?.can_comment !== false;

                  return (
                    <CommentListItem
                      key={comment.id}
                      comment={comment}
                      isOwner={isAuthor}
                      isHighlighted={highlightedId === comment.id}
                      isEditing={editingId === comment.id}
                      swipeEnabled={canReply && editingId !== comment.id}
                      canReply={canReply}
                      canDelete={isAuthor || userIsModerator}
                      canEdit={isAuthor && editingId !== comment.id}
                      likeCount={countsByComment[comment.id] || 0}
                      isLiked={userLikedSet.has(comment.id)}
                      parentComment={comment.expand?.reply_to}
                      userId={user?.id}
                      onReply={() => handleReply(comment)}
                      onToggleLike={() => handleToggleLike(comment.id)}
                      onStartEdit={() => handleStartEdit(comment)}
                      onDelete={() => handleDelete(comment.id)}
                      onOpenProfile={onOpenProfile}
                      onFocusParent={() => focusCommentInList(comment.expand?.reply_to?.id, 'start')}
                      innerRef={(node) => {
                        if (node) commentItemRefs.current.set(comment.id, node);
                        else commentItemRefs.current.delete(comment.id);
                      }}
                      editForm={
                        <form
                          className="gallery-comment-edit-form"
                          onSubmit={(event) => handleSaveEdit(event, comment.id)}
                        >
                          <label htmlFor={`gallery-comment-edit-${comment.id}`} className="visually-hidden">
                            Редактирование комментария
                          </label>
                          <PostRichTextField
                            id={`gallery-comment-edit-${comment.id}`}
                            value={editText}
                            onChange={setEditText}
                            enableFrame={false}
                            compact
                            placeholder="Текст комментария…"
                            aria-label="Редактирование комментария"
                          />
                          <div className="gallery-comment-edit-form__actions">
                            <button type="submit" disabled={!hasVisibleText(editText)}>
                              Сохранить
                            </button>
                            <button type="button" onClick={handleCancelEdit}>
                              Отмена
                            </button>
                          </div>
                        </form>
                      }
                    >
                      <PostContentHtml
                        as="p"
                        className={[
                          'comment-content-text',
                          isAuthor ? 'comment-content-text--own' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        content={comment.text}
                      />
                    </CommentListItem>
                  );
                })}
              </DayGroup>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default GalleryCommentModal;
