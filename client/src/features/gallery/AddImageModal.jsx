import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSubmit: (file: File) => Promise<void> | void
 * }} props
 */
function AddImageModal({ isOpen, onClose, onSubmit }) {
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [submitting, setSubmitting] = useState(false);
  const { alert } = useAlertDialog();

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      await alert({ title: 'Файл не выбран', message: 'Сначала выберите изображение.' });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(file);
      setFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Добавить фото">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="gallery-upload">Файл изображения</label>
          <input
            id="gallery-upload"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        {file && <p className="gallery-file-name">{file.name}</p>}
        <button type="submit" className="submit-btn-full" disabled={submitting}>
          {submitting ? 'Загружаем...' : 'Загрузить'}
        </button>
      </form>
    </Modal>
  );
}

export default AddImageModal;
