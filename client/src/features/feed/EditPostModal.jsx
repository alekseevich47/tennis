import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { updatePost } from '../../services/posts';
import { firstFileName, getMediaUrl } from '../../lib/media';
import { error } from '../../lib/log';

function isVideoMedia(file, filename) {
  if (file?.type?.startsWith('video/')) return true;
  return typeof filename === 'string' && /\.(mp4|webm|mov)$/i.test(filename);
}

function readMediaNames(media) {
  if (!media) return [];
  if (Array.isArray(media)) return media.filter(Boolean);
  return typeof media === 'string' ? [media] : [];
}

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
  const fileInputId = useId();
  const [text, setText] = useState('');
  const [mediaFile, setMediaFile] = useState(/** @type {File | null} */ (null));
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const existingMediaNames = useMemo(() => readMediaNames(post?.media), [post?.media]);
  const existingMediaName = firstFileName(existingMediaNames);
  const previewIsVideo = isVideoMedia(mediaFile, mediaFile?.name || existingMediaName);
  const existingMediaUrl = useMemo(
    () => (post && existingMediaName ? getMediaUrl(post, 'posts', existingMediaName) : null),
    [post, existingMediaName]
  );

  useEffect(() => {
    if (!mediaFile) {
      setSelectedMediaUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(mediaFile);
    setSelectedMediaUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [mediaFile]);

  useEffect(() => {
    if (!isOpen || !post) return;
    setText(post.content || post.text || '');
    setMediaFile(null);
  }, [isOpen, post]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!post || submitting) return;

    const nextContent = text.trim();
    if (!nextContent) return;

    setSubmitting(true);
    try {
      let payload = /** @type {FormData | { content: string }} */ ({ content: nextContent });

      if (mediaFile) {
        payload = new FormData();
        payload.append('content', nextContent);
        existingMediaNames.forEach((filename) => payload.append('media-', filename));
        payload.append('media', mediaFile);
      }

      const updatedPost = await updatePost(post.id, payload);
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
      showCloseButton={false}
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

        {(selectedMediaUrl || existingMediaUrl) && (
          <figure className="edit-post-media-preview">
            {previewIsVideo ? (
              <video src={selectedMediaUrl || existingMediaUrl} controls />
            ) : (
              <img
                src={selectedMediaUrl || existingMediaUrl}
                alt={mediaFile ? 'Новое медиа публикации' : 'Текущее медиа публикации'}
              />
            )}
            <figcaption>
              {mediaFile ? mediaFile.name : 'Текущее медиа публикации'}
            </figcaption>
          </figure>
        )}

        <div className="edit-post-media-controls">
          <label htmlFor={fileInputId} className="media-input-label">
            <span aria-hidden="true">📎</span>{' '}
            {existingMediaUrl || mediaFile ? 'Заменить медиа' : 'Добавить медиа'}
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="image/*,video/mp4"
            onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
            className="visually-hidden"
          />
          {mediaFile && (
            <button
              type="button"
              className="edit-post-reset-media-btn"
              onClick={() => setMediaFile(null)}
              disabled={submitting}
            >
              Вернуть текущее
            </button>
          )}
        </div>
        <p className="edit-post-hint">
          При выборе нового файла текущее медиа будет заменено после сохранения.
        </p>

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
