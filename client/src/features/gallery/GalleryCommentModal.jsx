import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useGalleryComments } from '../../hooks/useGalleryComments';
import { createGalleryComment, deleteGalleryComment } from '../../services/catalog';
import { formatPostDate } from '../../lib/format';
import { getMediaUrl, videoPreviewUrl } from '../../lib/media';
import { error } from '../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   mediaItem: any | null,
 *   user: any,
 *   userIsModerator: boolean,
 *   onClose: () => void
 * }} props
 */
function GalleryCommentModal({ isOpen, mediaItem, user, userIsModerator, onClose }) {
  const mediaId = mediaItem?.id || null;
  const { comments, mutate, isLoading } = useGalleryComments(isOpen ? mediaId : null);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setCommentText('');
      setIsAddingComment(false);
      setDeletingId(null);
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
      await deleteGalleryComment(commentId);
      await mutate();
    } catch (err) {
      error('delete gallery comment:', err);
    } finally {
      setDeletingId(null);
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
            {comments.map((comment) => (
              <div key={comment.id} className="gallery-comment-item">
                <div className="gallery-comment-item__header">
                  <span className="gallery-comment-item__author">
                    {comment.expand?.author?.name || comment.expand?.author?.full_name || 'Игрок секции'}
                  </span>
                  <span className="gallery-comment-item__date">
                    {formatPostDate(comment.created)}
                  </span>
                </div>

                <p className="gallery-comment-item__text">{comment.text}</p>

                {userIsModerator && (
                  <button
                    type="button"
                    className="gallery-comment-delete"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                  >
                    {deletingId === comment.id ? 'Удаляем...' : 'Удалить'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default GalleryCommentModal;
