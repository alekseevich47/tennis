import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { updatePost } from '../../services/posts';
import MediaPreviewGrid from './MediaPreviewGrid';
import {
  MAX_POST_MEDIA_FILES,
  getMediaUrl,
  isVideoFile,
  isVideoMediaName,
  mediaNames,
  readSelectedFiles
} from '../../lib/media';
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
  const fileInputId = useId();
  const [text, setText] = useState('');
  const [mediaFiles, setMediaFiles] = useState(/** @type {File[]} */ ([]));
  const [selectedPreviewItems, setSelectedPreviewItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const existingMediaNames = useMemo(() => mediaNames(post?.media), [post?.media]);
  const existingPreviewItems = useMemo(
    () =>
      post
        ? existingMediaNames.flatMap((filename) => {
          const url = getMediaUrl(post, 'posts', filename);
          return url
            ? [{
              key: `existing-${filename}`,
              url,
              name: filename,
              isVideo: isVideoMediaName(filename)
            }]
            : [];
        })
        : [],
    [post, existingMediaNames]
  );

  useEffect(() => {
    const items = mediaFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isVideo: isVideoFile(file)
    }));
    setSelectedPreviewItems(items);
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [mediaFiles]);

  useEffect(() => {
    if (!isOpen || !post) return;
    setText(post.content || post.text || '');
    setMediaFiles([]);
  }, [isOpen, post]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!post || submitting) return;

    const nextContent = text.trim();
    if (!nextContent) return;

    setSubmitting(true);
    try {
      let payload = /** @type {FormData | { content: string }} */ ({ content: nextContent });

      if (mediaFiles.length > 0) {
        payload = new FormData();
        payload.append('content', nextContent);
        existingMediaNames.forEach((filename) => payload.append('media-', filename));
        mediaFiles.forEach((file) => payload.append('media', file));
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
            name="edit-post-content"
            autoComplete="off"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Текст публикации…"
            rows={6}
            required
          />
        </div>

        <MediaPreviewGrid
          items={mediaFiles.length > 0 ? selectedPreviewItems : existingPreviewItems}
          className="edit-post-media-preview-grid"
          getAction={
            mediaFiles.length > 0
              ? (item) => (
                <button
                  type="button"
                  className="media-remove-btn"
                  onClick={() => setMediaFiles((current) => current.filter((file) => `${file.name}-${file.lastModified}` !== item.key))}
                  aria-label={`Убрать файл ${item.name}`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )
              : undefined
          }
        />

        <div className="edit-post-media-controls">
          <label className="media-input-label">
            <span aria-hidden="true">📎</span>{' '}
            {existingPreviewItems.length > 0 || mediaFiles.length > 0 ? 'Заменить медиа' : 'Добавить медиа'}
            <input
              id={fileInputId}
              name="edit-post-media"
              type="file"
              accept="image/*,video/mp4"
              multiple
              onChange={(event) => {
                setMediaFiles(readSelectedFiles(event.target.files, MAX_POST_MEDIA_FILES));
                event.currentTarget.value = '';
              }}
              className="visually-hidden"
            />
          </label>
          {mediaFiles.length > 0 && (
            <button
              type="button"
              className="edit-post-reset-media-btn"
              onClick={() => setMediaFiles([])}
              disabled={submitting}
            >
              Вернуть текущее
            </button>
          )}
        </div>
        <p className="edit-post-hint">
          Можно выбрать до {MAX_POST_MEDIA_FILES} файлов. Новые файлы заменят текущее медиа после сохранения.
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
            {submitting ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditPostModal;
