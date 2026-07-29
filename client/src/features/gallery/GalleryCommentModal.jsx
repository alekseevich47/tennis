import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import PostContentHtml from '../feed/PostContentHtml';
import PostRichTextField from '../feed/PostRichTextField';
import CommentSendButton from '../feed/CommentSendButton';
import CommentReplyButton from '../feed/CommentReplyButton';
import CommentReplyComposeBar from '../feed/CommentReplyComposeBar';
import CommentReplyQuote from '../feed/CommentReplyQuote';
import CommentSwipeReply from '../feed/CommentSwipeReply';
import { hasVisibleText, toDisplayHtml } from '../feed/postRichText';
import { useGalleryComments } from '../../hooks/useGalleryComments';
import { useCommentLikes } from '../../hooks/useCommentLikes';
import {
  createGalleryComment,
  deleteGalleryComment,
  updateGalleryComment
} from '../../services/catalog';
import { toggleCommentLike } from '../../services/posts';
import { formatPostDate } from '../../lib/format';
import { getMediaUrl, videoPreviewUrl } from '../../lib/media';
import { error } from '../../lib/log';
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
  mediaItem,
  user,
  userIsModerator,
  onClose,
  onOpenProfile,
  highlightCommentId = null
}) {
  const mediaId = mediaItem?.id || null;
  const { comments, mutate, isLoading } = useGalleryComments(isOpen ? mediaId : null);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState(/** @type {any | null} */ (null));
  const [togglingLikeId, setTogglingLikeId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(/** @type {string | null} */ (null));

  const commentItemRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const commentFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const isAddingCommentRef = useRef(false);
  const highlightClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const commentIds = useMemo(() => comments.map((c) => c.id), [comments]);

  const { countsByComment, userLikedSet, mutateLikes } = useCommentLikes(
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

  const handleToggleLike = async (commentId) => {
    if (!user?.id || togglingLikeId) return;
    setTogglingLikeId(commentId);
    try {
      await toggleCommentLike(commentId, COMMENT_COLLECTION, user.id);
      await mutateLikes();
    } catch (err) {
      error('toggle gallery comment like:', err);
    } finally {
      setTogglingLikeId(null);
    }
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
          <p className="gallery-comments-empty">Загрузка комментариев...</p>
        ) : comments.length === 0 ? (
          <p className="gallery-comments-empty">Комментариев пока нет.</p>
        ) : (
          <div className="gallery-comments-list">
            {comments.map((comment) => {
              const isAuthor = comment.author === user?.id;
              const canEdit = isAuthor || userIsModerator;
              const likeCount = countsByComment[comment.id] || 0;
              const isLiked = userLikedSet.has(comment.id);
              const parentComment = comment.expand?.reply_to;
              const canReply = user?.can_comment !== false;
              const swipeEnabled = canReply && editingId !== comment.id;

              return (
                <CommentSwipeReply
                  key={comment.id}
                  className={`gallery-comment-item${highlightedId === comment.id ? ' modal-comment-item--highlight' : ''}`}
                  enabled={swipeEnabled}
                  onReply={() => handleReply(comment)}
                  innerRef={(node) => {
                    if (node) commentItemRefs.current.set(comment.id, node);
                    else commentItemRefs.current.delete(comment.id);
                  }}
                >
                  {canEdit && (
                    <div
                      className="gallery-comment-item__actions"
                      role="group"
                      aria-label="Действия с комментарием"
                    >
                      <button
                        type="button"
                        className="gallery-comment-icon-button gallery-comment-icon-button--edit"
                        onClick={() => handleStartEdit(comment)}
                        disabled={editingId === comment.id}
                        aria-label="Редактировать комментарий"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
                          <path d="m13.7 6.1 4.2 4.2" />
                        </svg>
                      </button>
                      {userIsModerator && (
                        <button
                          type="button"
                          className="gallery-comment-icon-button gallery-comment-icon-button--delete"
                          onClick={() => handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                          aria-label="Удалить комментарий"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M4 7h16" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M6 7l1 13h10l1-13" />
                            <path d="M9 7V4h6v3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className="gallery-comment-item__header"
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenProfile?.(comment.expand?.author)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenProfile?.(comment.expand?.author);
                      }
                    }}
                    aria-label={`Открыть профиль ${comment.expand?.author?.full_name || 'игрока'}`}
                  >
                    <Avatar
                      user={comment.expand?.author}
                      size="sm"
                      className="gallery-comment-item__avatar"
                    />
                    <span className="gallery-comment-item__author">
                      {comment.expand?.author?.full_name || 'Игрок секции'}
                    </span>
                  </div>

                  {editingId === comment.id ? (
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
                  ) : (
                    <div className="comment-body-indent">
                      {parentComment ? (
                        <CommentReplyQuote
                          author={parentComment.expand?.author || null}
                          text={parentComment.text}
                          onOpenProfile={onOpenProfile}
                          onActivate={() => focusCommentInList(parentComment.id, 'start')}
                        />
                      ) : null}
                      <PostContentHtml
                        as="p"
                        className="gallery-comment-item__text"
                        content={comment.text}
                      />
                    </div>
                  )}

                  {editingId !== comment.id && (
                    <div className="comment-footer-row gallery-comment-item__footer">
                      <div className="comment-footer-actions">
                        <button
                          type="button"
                          className={`comment-like-btn${isLiked ? ' comment-like-btn--active' : ''}`}
                          onClick={() => handleToggleLike(comment.id)}
                          disabled={!user?.id || togglingLikeId === comment.id}
                          aria-label={isLiked ? 'Убрать лайк' : 'Поставить лайк'}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          {likeCount > 0 && (
                            <span className="comment-like-count">{likeCount}</span>
                          )}
                        </button>
                        {canReply ? (
                          <CommentReplyButton onClick={() => handleReply(comment)} />
                        ) : null}
                      </div>
                      <span className="comment-timestamp-text gallery-comment-item__date">
                        {formatPostDate(comment.created)}
                      </span>
                    </div>
                  )}
                </CommentSwipeReply>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default GalleryCommentModal;
