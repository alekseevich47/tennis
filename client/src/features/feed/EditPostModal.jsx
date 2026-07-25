import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { updatePost } from '../../services/posts';
import MediaPreviewGrid from './MediaPreviewGrid';
import PostRichTextField from './PostRichTextField';
import {
  MAX_POST_MEDIA_FILES,
  getMediaUrl,
  isVideoFile,
  isVideoMediaName,
  mediaNames,
  readSelectedFiles
} from '../../lib/media';
import { error } from '../../lib/log';
import { hasVisibleText, toDisplayHtml } from './postRichText';

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
  const [removedMediaNames, setRemovedMediaNames] = useState(/** @type {string[]} */ ([]));
  const [newPreviewItems, setNewPreviewItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const existingMediaNames = useMemo(() => mediaNames(post?.media), [post?.media]);
  const keptExistingMediaNames = useMemo(
    () => existingMediaNames.filter((filename) => !removedMediaNames.includes(filename)),
    [existingMediaNames, removedMediaNames]
  );
  const existingPreviewItems = useMemo(
    () =>
      post
        ? keptExistingMediaNames.flatMap((filename) => {
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
    [post, keptExistingMediaNames]
  );
  const previewItems = useMemo(
    () => [...existingPreviewItems, ...newPreviewItems],
    [existingPreviewItems, newPreviewItems]
  );
  const remainingMediaSlots = Math.max(
    0,
    MAX_POST_MEDIA_FILES - keptExistingMediaNames.length - mediaFiles.length
  );

  useEffect(() => {
    const items = mediaFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isVideo: isVideoFile(file)
    }));
    setNewPreviewItems(items);
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [mediaFiles]);

  useEffect(() => {
    if (!isOpen || !post) return;
    setText(toDisplayHtml(post.content || post.text || ''));
    setMediaFiles([]);
    setRemovedMediaNames([]);
  }, [isOpen, post]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!post || submitting) return;

    if (!hasVisibleText(text)) return;
    const nextContent = text;

    setSubmitting(true);
    try {
      const hasMediaChanges = removedMediaNames.length > 0 || mediaFiles.length > 0;
      let payload = /** @type {FormData | { content: string }} */ ({ content: nextContent });

      if (hasMediaChanges) {
        payload = new FormData();
        payload.append('content', nextContent);
        removedMediaNames.forEach((filename) => payload.append('media-', filename));
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
          <PostRichTextField
            id={textareaId}
            value={text}
            onChange={setText}
            placeholder="Текст публикации…"
            compact={false}
          />
        </div>

        <MediaPreviewGrid
          items={previewItems}
          className="edit-post-media-preview-grid"
          getAction={(item) => (
            <button
              type="button"
              className="media-remove-btn"
              onClick={() => {
                if (item.key.startsWith('existing-')) {
                  const filename = item.key.slice('existing-'.length);
                  setRemovedMediaNames((current) =>
                    current.includes(filename) ? current : [...current, filename]
                  );
                  return;
                }
                setMediaFiles((current) =>
                  current.filter((file) => `${file.name}-${file.lastModified}` !== item.key)
                );
              }}
              aria-label={`Убрать файл ${item.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        />

        <div className="edit-post-media-controls">
          <label className="media-input-label">
            <span aria-hidden="true">📎</span>{' '}
            Добавить медиа
            <input
              id={fileInputId}
              name="edit-post-media"
              type="file"
              accept="image/*,video/mp4"
              multiple
              disabled={remainingMediaSlots === 0}
              onChange={(event) => {
                const incoming = readSelectedFiles(event.target.files, remainingMediaSlots);
                setMediaFiles((current) => [...current, ...incoming].slice(0, MAX_POST_MEDIA_FILES));
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
              Убрать новые файлы
            </button>
          )}
        </div>
        <p className="edit-post-hint">
          До {MAX_POST_MEDIA_FILES} файлов в публикации. Удалённые и новые файлы применятся после сохранения.
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
            disabled={submitting || !hasVisibleText(text)}
          >
            {submitting ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditPostModal;
