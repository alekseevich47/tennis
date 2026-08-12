import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import FullscreenImageViewer from './FullscreenImageViewer';
import MediaPreviewGrid from './MediaPreviewGrid';
import PostAttachButton from './PostAttachButton';
import PostRichTextField from './PostRichTextField';
import { useLocalMediaFullscreen } from './useLocalMediaFullscreen';
import { useYadiskEmbed } from './useYadiskEmbed';
import { ALBUM_COVER_RADIUS, ALBUM_WINDOW_RADIUS } from './yadiskAlbumLazy';
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
  const fileInputId = useId();
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const { confirm } = useAlertDialog();

  const onAlbumConflict = useCallback(
    () =>
      confirm({
        title: 'Заменить медиа альбомом?',
        message: 'В публикации может быть только один альбом Яндекс.Диска. Текущие медиа будут удалены.',
        confirmText: 'Заменить',
        cancelText: 'Отмена'
      }),
    [confirm]
  );

  const onSinglesConflict = useCallback(
    () =>
      confirm({
        title: 'Заменить альбом?',
        message: 'Альбом Яндекс.Диска будет удалён, вместо него можно добавить одиночные медиа.',
        confirmText: 'Заменить',
        cancelText: 'Отмена'
      }),
    [confirm]
  );

  const clearLocalMedia = useCallback(() => {
    setFiles([]);
  }, []);

  const yadiskSlots = Math.max(0, MAX_POST_MEDIA_FILES - files.length);
  const yadisk = useYadiskEmbed({
    text,
    setText,
    remainingSlots: yadiskSlots,
    enabled: isOpen,
    hasLocalMedia: files.length > 0,
    onClearLocalMedia: clearLocalMedia,
    onAlbumConflict,
    onSinglesConflict
  });

  const albumExpandedRef = useRef(false);

  const handleAlbumFocus = useCallback(
    (index, focusOptions) => {
      if (!yadisk.albumPublicUrl) return;
      if (index !== 0) albumExpandedRef.current = true;
      const radius =
        typeof focusOptions?.radius === 'number'
          ? focusOptions.radius
          : albumExpandedRef.current
            ? ALBUM_WINDOW_RADIUS
            : ALBUM_COVER_RADIUS;
      yadisk.setAlbumFocus(yadisk.albumPublicUrl, index, { radius });
    },
    [yadisk]
  );

  const allPreviewItems = yadisk.albumMode
    ? yadisk.previewItems
    : [...previewItems, ...yadisk.previewItems];
  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    hiddenMediaKey,
    onCloseStart: handlePreviewCloseStart,
    handleActiveIndexChange: handlePreviewAlbumIndex
  } = useLocalMediaFullscreen(allPreviewItems, 'create-post', {
    onAlbumFocus: handleAlbumFocus
  });

  const handleAlbumIndexChange = useCallback(
    (_item, index) => {
      handleAlbumFocus(index);
    },
    [handleAlbumFocus]
  );

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
  const fileSlotsLeft = yadisk.albumMode
    ? 0
    : Math.max(0, MAX_POST_MEDIA_FILES - files.length - yadisk.count);

  const reset = () => {
    setText('');
    setFiles([]);
    albumExpandedRef.current = false;
    yadisk.reset();
  };

  const handleClose = async () => {
    if (hasText || files.length > 0 || yadisk.count > 0) {
      const ok = await confirm({
        title: 'Отменить публикацию?',
        message: 'Введённый текст и выбранные файлы будут потеряны.',
        confirmText: 'Отменить',
        cancelText: 'Продолжить',
        confirmVariant: 'danger'
      });
      if (!ok) return;
    }
    reset();
    onClose();
  };

  const handleAttachClick = async () => {
    if (yadisk.albumMode) {
      const ok = await onSinglesConflict();
      if (!ok) return;
      yadisk.reset();
    }
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!hasText && !hasMedia) || yadisk.hasPending) return;
    const formData = new FormData();
    formData.append('content', text.trim());
    formData.append('author', user?.id || '');
    formData.append('external_media', JSON.stringify(yadisk.storedMedia));
    if (!yadisk.albumMode) {
      const preparedFiles = await Promise.all(
        files.map((file) => (isVideoFile(file) ? file : compressImage(file)))
      );
      preparedFiles.forEach((file) => formData.append('media', file));
    }
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

        <input
          ref={fileInputRef}
          id={fileInputId}
          name="post-media"
          type="file"
          accept="image/*,video/mp4"
          multiple
          disabled={fileSlotsLeft === 0 && !yadisk.albumMode}
          onChange={(e) => {
            const incoming = readSelectedFiles(e.target.files, fileSlotsLeft);
            setFiles((current) => [...current, ...incoming]);
            e.currentTarget.value = '';
          }}
          className="visually-hidden"
        />

        <MediaPreviewGrid
          items={allPreviewItems}
          className="create-post-preview-grid"
          originKeyPrefix="create-post"
          hiddenMediaKey={hiddenMediaKey}
          onItemClick={openPreviewMedia}
          onAlbumIndexChange={handleAlbumIndexChange}
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

        <div className="modal-actions create-post-form__actions create-post-form__actions--with-attach">
          <PostAttachButton
            disabled={fileSlotsLeft === 0 && !yadisk.albumMode}
            onClick={handleAttachClick}
          />
          <button
            type="submit"
            className="submit-btn-full create-post-form__publish"
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
          onActiveIndexChange={
            previewFullscreen.isAlbum ? handlePreviewAlbumIndex : undefined
          }
          onClose={closePreviewFullscreen}
        />
      ) : null}
    </Modal>
  );
}

export default CreatePostModal;
