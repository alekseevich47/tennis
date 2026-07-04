import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
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

/**
 * @param {{
 *   isOpen: boolean,
 *   mediaItem: any | null,
 *   user: any,
 *   userIsModerator: boolean,
 *   onClose: () => void,
 *   onOpenProfile?: (user: any) => void
 * }} props
 */
function GalleryCommentModal({ isOpen, mediaItem, user, userIsModerator, onClose, onOpenProfile }) {
  const mediaId = mediaItem?.id || null;
  const { comments, mutate, isLoading } = useGalleryComments(isOpen ? mediaId : null);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [togglingLikeId, setTogglingLikeId] = useState(null);

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
    }
  }, [isOpen, mediaId]);

  if (!mediaItem) return null;

  const isVideo = mediaItem.media_type === 'video';
  const mediaFile = isVideo ? mediaItem.video : mediaItem.image;
  const mediaUrl = getMediaUrl(mediaItem, 'gallery', mediaFile);

  const handleAdd = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || !mediaId || !user?.id || isAddingComment) return;

    setIsAddingComment(true);
    try {
      await createGalleryComment({ mediaId, authorId: user.id, text });
      setCommentText('');
      await mutate();
    } catch (err) {
      error('add gallery comment:', err);
    } finally {
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
    setEditText(comment.text || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = async (event, commentId) => {
    event.preventDefault();
    const text = editText.trim();
    if (!text || !commentId) return;

    try {
      await updateGalleryComment(commentId, text, mediaId);
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
          <form className="gallery-comment-form" onSubmit={handleAdd}>
            <label htmlFor="gallery-comment-input" className="visually-hidden">
              Написать комментарий
            </label>
            <textarea
              id="gallery-comment-input"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Написать комментарий..."
              rows={2}
              disabled={isAddingComment}
              required
            />
            <button type="submit" disabled={isAddingComment || !commentText.trim()}>
              {isAddingComment ? 'Отправляем...' : 'Отправить'}
            </button>
          </form>
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

              return (
                <div key={comment.id} className="gallery-comment-item">
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
                      <textarea
                        id={`gallery-comment-edit-${comment.id}`}
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        rows={3}
                        required
                      />
                      <div className="gallery-comment-edit-form__actions">
                        <button type="submit" disabled={!editText.trim()}>
                          Сохранить
                        </button>
                        <button type="button" onClick={handleCancelEdit}>
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="gallery-comment-item__text">{comment.text}</p>
                  )}

                  {editingId !== comment.id && (
                    <div className="comment-footer-row gallery-comment-item__footer">
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
                      <span className="comment-timestamp-text gallery-comment-item__date">
                        {formatPostDate(comment.created)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default GalleryCommentModal;
