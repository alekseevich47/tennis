import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import FullscreenImageViewer from './FullscreenImageViewer';
import MediaPreviewGrid from './MediaPreviewGrid';
import PostAttachButton from './PostAttachButton';
import PostScheduleButton from './PostScheduleButton';
import PostRichTextField from './PostRichTextField';
import PublishLongPressMenu from './PublishLongPressMenu';
import ScheduleDateTimeSheet from './ScheduleDateTimeSheet';
import ScheduledPostsModal from './ScheduledPostsModal';
import EditPostModal from './EditPostModal';
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
import { useLongPress, LongPressRing } from '../../lib/longPress';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import {
  deleteScheduledPost,
  publishScheduledPostNow,
  reschedulePost
} from '../../services/posts';

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
  const [captionAbove, setCaptionAbove] = useState(true);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [scheduledListOpen, setScheduledListOpen] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState(null);
  const fileInputId = useId();
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const { confirm } = useAlertDialog();
  const { items: scheduledItems, count: scheduledCount, mutate: mutateScheduled } =
    useScheduledPosts('posts', { enabled: isOpen });

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
      yadisk.setAlbumFocus(yadisk.albumPublicUrl, index, {
        radius,
        preferFull: albumExpandedRef.current || focusOptions?.preferFull === true
      });
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
  const canPublish = (hasText || hasMedia) && !yadisk.hasPending;
  const canMoveText = hasText && hasMedia;
  const fileSlotsLeft = yadisk.albumMode
    ? 0
    : Math.max(0, MAX_POST_MEDIA_FILES - files.length - yadisk.count);

  const reset = () => {
    setText('');
    setFiles([]);
    setCaptionAbove(true);
    setPreviewMenuOpen(false);
    setScheduleSheetOpen(false);
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

  const buildFormData = useCallback(
    async (scheduledAt = /** @type {string | null} */ (null)) => {
      const formData = new FormData();
      formData.append('content', text.trim());
      formData.append('author', user?.id || '');
      formData.append('external_media', JSON.stringify(yadisk.storedMedia));
      formData.append('caption_above', captionAbove ? 'true' : 'false');
      if (scheduledAt) {
        formData.append('is_scheduled', 'true');
        formData.append('scheduled_at', scheduledAt);
      }
      if (!yadisk.albumMode) {
        const preparedFiles = await Promise.all(
          files.map((file) => (isVideoFile(file) ? file : compressImage(file)))
        );
        preparedFiles.forEach((file) => formData.append('media', file));
      }
      return formData;
    },
    [text, user?.id, yadisk.storedMedia, yadisk.albumMode, captionAbove, files]
  );

  const submitPublish = async (scheduledAt = /** @type {string | null} */ (null)) => {
    if (!canPublish) return;
    const formData = await buildFormData(scheduledAt);
    onCreated(formData);
    reset();
    onClose();
    if (scheduledAt) mutateScheduled();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (previewMenuOpen) {
      setPreviewMenuOpen(false);
      return;
    }
    await submitPublish(null);
  };

  const { handlers: longPressHandlers, ringProps } = useLongPress({
    enabled: canPublish && !previewMenuOpen && !scheduleSheetOpen,
    onLongPress: () => setPreviewMenuOpen(true),
    durationMs: 450
  });

  return (
    <>
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
          {captionAbove ? (
            <PostRichTextField
              id="create-post-text"
              value={text}
              onChange={setText}
              placeholder="Что нового в секции?…"
            />
          ) : null}

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

          {!captionAbove ? (
            <PostRichTextField
              id="create-post-text"
              value={text}
              onChange={setText}
              placeholder="Что нового в секции?…"
            />
          ) : null}

          <div className="modal-actions create-post-form__actions create-post-form__actions--with-attach">
            <PostAttachButton
              disabled={fileSlotsLeft === 0 && !yadisk.albumMode}
              onClick={handleAttachClick}
            />
            {scheduledCount > 0 ? (
              <PostScheduleButton
                count={scheduledCount}
                onClick={() => setScheduledListOpen(true)}
              />
            ) : null}
            <button
              type="submit"
              className="submit-btn-full create-post-form__publish"
              disabled={!canPublish}
              {...(canPublish ? longPressHandlers : {})}
            >
              {yadisk.hasPending ? 'Загружаем превью…' : 'Опубликовать'}
            </button>
            <LongPressRing {...ringProps} />
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

      <PublishLongPressMenu
        isOpen={previewMenuOpen}
        text={text}
        previewItems={allPreviewItems}
        captionAbove={captionAbove}
        canMoveText={canMoveText}
        onToggleCaption={() => setCaptionAbove((v) => !v)}
        onSendLater={() => {
          setPreviewMenuOpen(false);
          setScheduleSheetOpen(true);
        }}
        onPublishNow={() => {
          setPreviewMenuOpen(false);
          void submitPublish(null);
        }}
        onClose={() => setPreviewMenuOpen(false)}
      />

      <ScheduleDateTimeSheet
        isOpen={scheduleSheetOpen}
        onClose={() => setScheduleSheetOpen(false)}
        onConfirm={(date) => {
          setScheduleSheetOpen(false);
          void submitPublish(date.toISOString());
        }}
      />

      <ScheduledPostsModal
        isOpen={scheduledListOpen}
        onClose={() => setScheduledListOpen(false)}
        kind="posts"
        items={scheduledItems}
        onMutate={() => mutateScheduled()}
        onEditPost={(post) => {
          setScheduledListOpen(false);
          setEditingScheduled(post);
        }}
        publishNow={publishScheduledPostNow}
        reschedule={reschedulePost}
        remove={deleteScheduledPost}
      />

      <EditPostModal
        isOpen={Boolean(editingScheduled)}
        post={editingScheduled}
        onClose={() => setEditingScheduled(null)}
        onSaved={() => {
          setEditingScheduled(null);
          mutateScheduled();
        }}
      />
    </>
  );
}

export default CreatePostModal;
