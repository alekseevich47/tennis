import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import MediaPreviewGrid from './MediaPreviewGrid';
import { compressImage } from '../../lib/compress';
import {
  MAX_POST_MEDIA_FILES,
  isVideoFile,
  readSelectedFiles
} from '../../lib/media';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onCreated: (payload: FormData) => void,
 *   user: any
 * }} props
 */
function CreatePostModal({ isOpen, onClose, onCreated, user }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [previewItems, setPreviewItems] = useState([]);
  const { confirm } = useAlertDialog();

  useEffect(() => {
    const items = files.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isVideo: isVideoFile(file)
    }));
    setPreviewItems(items);
    return () => items.forEach((item) => URL.revokeObjectURL(item.url));
  }, [files]);

  const reset = () => {
    setText('');
    setFiles([]);
  };

  const handleClose = async () => {
    if (text.trim() || files.length > 0) {
      const ok = await confirm({
        title: 'Отменить публикацию?',
        message: 'Введённый текст и выбранные файлы будут потеряны.',
        confirmText: 'Отменить',
        cancelText: 'Продолжить'
      });
      if (!ok) return;
    }
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    const formData = new FormData();
    formData.append('content', text.trim());
    formData.append('author', user?.id || '');
    const preparedFiles = await Promise.all(
      files.map((file) => (isVideoFile(file) ? file : compressImage(file)))
    );
    preparedFiles.forEach((file) => formData.append('media', file));
    onCreated(formData);
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Новая публикация">
      <form onSubmit={handleSubmit} className="create-post-form">
        <label htmlFor="create-post-text" className="visually-hidden">
          Текст публикации
        </label>
        <textarea
          id="create-post-text"
          name="post-content"
          autoComplete="off"
          placeholder="Что нового в секции?…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="media-upload-group">
          <label htmlFor="create-post-media" className="media-input-label">
            <span aria-hidden="true">📎</span>{' '}
            {files.length > 0 ? `Выбрано: ${files.length}` : 'Добавить медиа'}
            <input
              id="create-post-media"
              name="post-media"
              type="file"
              accept="image/*,video/mp4"
              multiple
              onChange={(e) => {
                setFiles(readSelectedFiles(e.target.files, MAX_POST_MEDIA_FILES));
                e.currentTarget.value = '';
              }}
              className="visually-hidden"
            />
          </label>
          <span className="file-name-preview">До {MAX_POST_MEDIA_FILES} файлов</span>
        </div>

        <MediaPreviewGrid
          items={previewItems}
          className="create-post-preview-grid"
          getAction={(item) => (
            <button
              type="button"
              className="media-remove-btn"
              onClick={() => setFiles((current) => current.filter((file) => `${file.name}-${file.lastModified}` !== item.key))}
              aria-label={`Убрать файл ${item.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        />

        <div className="modal-actions">
          <button
            type="submit"
            className="submit-btn-full"
            disabled={!text.trim() && files.length === 0}
          >
            Опубликовать
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreatePostModal;
