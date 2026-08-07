import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import FullscreenImageViewer from './FullscreenImageViewer';
import MediaPreviewGrid from './MediaPreviewGrid';
import PostRichTextField from './PostRichTextField';
import { useLocalMediaFullscreen } from './useLocalMediaFullscreen';
import { useYadiskEmbed } from './useYadiskEmbed';
import { compressImage } from '../../lib/compress';
import {
  MAX_POST_MEDIA_FILES,
  isVideoFile,
  readSelectedFiles
} from '../../lib/media';
import { hasVisibleText } from './postRichText';

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

  const yadiskSlots = Math.max(0, MAX_POST_MEDIA_FILES - files.length);
  const yadisk = useYadiskEmbed({
    text,
    setText,
    remainingSlots: yadiskSlots,
    enabled: isOpen
  });

  const allPreviewItems = [...previewItems, ...yadisk.previewItems];
  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    hiddenMediaKey,
    onCloseStart: handlePreviewCloseStart
  } = useLocalMediaFullscreen(allPreviewItems, 'create-post');

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

  const hasText = hasVisibleText(text);
  const hasMedia = files.length > 0 || yadisk.readyCount > 0;
  const fileSlotsLeft = Math.max(0, MAX_POST_MEDIA_FILES - files.length - yadisk.count);

  const reset = () => {
    setText('');
    setFiles([]);
    yadisk.reset();
  };

  const handleClose = async () => {
    if (hasText || files.length > 0 || yadisk.count > 0) {
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
    if ((!hasText && !hasMedia) || yadisk.hasPending) return;
    const formData = new FormData();
    formData.append('content', text.trim());
    formData.append('author', user?.id || '');
    formData.append('external_media', JSON.stringify(yadisk.storedMedia));
    const preparedFiles = await Promise.all(
      files.map((file) => (isVideoFile(file) ? file : compressImage(file)))
    );
    preparedFiles.forEach((file) => formData.append('media', file));
    onCreated(formData);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Новая публикация"
      className="create-post-modal"
      overlayClassName="create-post-modal-overlay"
    >
      <form onSubmit={handleSubmit} className="create-post-form">
        <label htmlFor="create-post-text" className="visually-hidden">
          Текст публикации
        </label>
        <PostRichTextField
          id="create-post-text"
          value={text}
          onChange={setText}
          placeholder="Что нового в секции?…"
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
              disabled={fileSlotsLeft === 0}
              onChange={(e) => {
                setFiles(readSelectedFiles(e.target.files, fileSlotsLeft));
                e.currentTarget.value = '';
              }}
              className="visually-hidden"
            />
          </label>
          <span className="file-name-preview">
            До {MAX_POST_MEDIA_FILES} файлов · ссылка Яндекс.Диска → превью
          </span>
        </div>

        <MediaPreviewGrid
          items={allPreviewItems}
          className="create-post-preview-grid"
          originKeyPrefix="create-post"
          hiddenMediaKey={hiddenMediaKey}
          onItemClick={openPreviewMedia}
          getAction={(item) => (
            <button
              type="button"
              className="media-remove-btn"
              onClick={(event) => {
                event.stopPropagation();
                if (String(item.key).startsWith('yadisk-')) {
                  yadisk.removeItem(item.key);
                  return;
                }
                setFiles((current) =>
                  current.filter((file) => `${file.name}-${file.lastModified}` !== item.key)
                );
              }}
              aria-label={`Убрать файл ${item.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        />

        <div className="modal-actions create-post-form__actions">
          <button
            type="submit"
            className="submit-btn-full"
            disabled={(!hasText && !hasMedia) || yadisk.hasPending}
          >
            {yadisk.hasPending ? 'Загружаем превью…' : 'Опубликовать'}
          </button>
        </div>
      </form>

      {previewFullscreen ? (
        <FullscreenImageViewer
          items={previewFullscreen.items}
          initialIndex={previewFullscreen.index}
          originRect={previewFullscreen.originRect}
          originKey={previewFullscreen.originKey}
          onCloseStart={handlePreviewCloseStart}
          onClose={closePreviewFullscreen}
        />
      ) : null}
    </Modal>
  );
}

export default CreatePostModal;
