import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { createPost } from '../../services/posts';
import { error } from '../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onCreated: () => void,
 *   user: any
 * }} props
 */
function CreatePostModal({ isOpen, onClose, onCreated, user }) {
  const [text, setText] = useState('');
  // Фикс C2: храним именно File, а не FileList.
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [submitting, setSubmitting] = useState(false);
  const { confirm } = useAlertDialog();

  const reset = () => {
    setText('');
    setFile(null);
  };

  const handleClose = async () => {
    if (text.trim() || file) {
      const ok = await confirm({
        title: 'Отменить публикацию?',
        message: 'Введённый текст и файл будут потеряны.',
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
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', text);
      formData.append('author', user?.id || '');
      if (file) formData.append('media', file);
      await createPost(formData);
      reset();
      onCreated();
    } catch (err) {
      error('Ошибка публикации:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Новая публикация">
      <form onSubmit={handleSubmit} className="create-post-form">
        <label htmlFor="create-post-text" className="visually-hidden">
          Текст публикации
        </label>
        <textarea
          id="create-post-text"
          placeholder="Что нового в секции?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />

        <div className="media-upload-group">
          <label className="media-input-label">
            <span aria-hidden="true">📸</span> {file ? 'Фото выбрано' : 'Добавить фото'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
            />
          </label>
          {file && <span className="file-name-preview">{file.name}</span>}
        </div>

        <div className="modal-actions">
          <button type="submit" className="submit-btn-full" disabled={submitting}>
            {submitting ? 'Публикуем...' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreatePostModal;
