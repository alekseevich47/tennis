import React, { useEffect, useId, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { updatePost } from '../../services/posts';
import { error } from '../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   post: import('../../services/posts').PostRecord | null,
 *   onClose: () => void,
 *   onSaved: (post: import('../../services/posts').PostRecord) => void
 * }} props
 */
function EditPostModal({ isOpen, post, onClose, onSaved }) {
  const textareaId = useId();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !post) return;
    setText(post.content || post.text || '');
  }, [isOpen, post]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!post || submitting) return;

    const nextContent = text.trim();
    if (!nextContent) return;

    setSubmitting(true);
    try {
      const updatedPost = await updatePost(post.id, { content: nextContent });
      onSaved(updatedPost);
    } catch (err) {
      error('Ошибка редактирования публикации:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Редактировать публикацию"
      className="edit-post-modal"
    >
      <form onSubmit={handleSubmit} className="edit-post-form">
        <label htmlFor={textareaId} className="edit-post-label">
          Текст поста
        </label>
        <div className="edit-post-bubble">
          <textarea
            id={textareaId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Текст публикации"
            rows={6}
            required
          />
        </div>
        {post?.media && (
          <p className="edit-post-hint">
            Медиа останется без изменений. Сейчас редактируется только текст публикации.
          </p>
        )}
        <div className="modal-actions edit-post-actions">
          <button
            type="button"
            className="edit-post-cancel-btn"
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="submit-btn-full edit-post-save-btn"
            disabled={submitting || !text.trim()}
          >
            {submitting ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditPostModal;
