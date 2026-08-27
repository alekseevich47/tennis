import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { updatePost } from '../../services/posts';
import FullscreenImageViewer from './FullscreenImageViewer';
import SortableMediaPreviewGrid from './SortableMediaPreviewGrid';
import PostAttachButton from './PostAttachButton';
import PostRichTextField from './PostRichTextField';
import PublishLongPressMenu from './PublishLongPressMenu';
import { useLocalMediaFullscreen } from './useLocalMediaFullscreen';
import { useYadiskEmbed } from './useYadiskEmbed';
import { ALBUM_COVER_RADIUS, ALBUM_WINDOW_RADIUS } from './yadiskAlbumLazy';
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
import { useLongPress, LongPressRing } from '../../lib/longPress';

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
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [text, setText] = useState('');
  const [mediaFiles, setMediaFiles] = useState(/** @type {File[]} */ ([]));
  const [removedMediaNames, setRemovedMediaNames] = useState(/** @type {string[]} */ ([]));
  const [existingOrder, setExistingOrder] = useState(/** @type {string[]} */ ([]));
  const [newPreviewItems, setNewPreviewItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [captionAbove, setCaptionAbove] = useState(true);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const { confirm } = useAlertDialog();

  const existingMediaNames = useMemo(() => mediaNames(post?.media), [post?.media]);
  const keptExistingMediaNames = useMemo(
    () => existingOrder.filter((filename) => !removedMediaNames.includes(filename)),
    [existingOrder, removedMediaNames]
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
    setMediaFiles([]);
    setRemovedMediaNames(existingMediaNames);
  }, [existingMediaNames]);

  const yadiskSlots = Math.max(
    0,
    MAX_POST_MEDIA_FILES - keptExistingMediaNames.length - mediaFiles.length
  );
  const yadisk = useYadiskEmbed({
    text,
    setText,
    remainingSlots: yadiskSlots,
    initialKey: isOpen && post ? post.id : null,
    initialItems: post?.external_media,
    enabled: isOpen,
    hasLocalMedia: keptExistingMediaNames.length > 0 || mediaFiles.length > 0,
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

  const previewItems = useMemo(
    () =>
      yadisk.albumMode
        ? yadisk.previewItems
        : [...existingPreviewItems, ...newPreviewItems, ...yadisk.previewItems],
    [existingPreviewItems, newPreviewItems, yadisk.albumMode, yadisk.previewItems]
  );
  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    hiddenMediaKey,
    onCloseStart: handlePreviewCloseStart,
    handleActiveIndexChange: handlePreviewAlbumIndex
  } = useLocalMediaFullscreen(previewItems, 'edit-post', {
    onAlbumFocus: handleAlbumFocus
  });

  const handleAlbumIndexChange = useCallback(
    (_item, index) => {
      handleAlbumFocus(index);
    },
    [handleAlbumFocus]
  );
  const remainingMediaSlots = yadisk.albumMode
    ? 0
    : Math.max(
      0,
      MAX_POST_MEDIA_FILES -
        keptExistingMediaNames.length -
        mediaFiles.length -
        yadisk.count
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
    setExistingOrder(mediaNames(post.media));
    setCaptionAbove(post.caption_above !== false);
    setPreviewMenuOpen(false);
  }, [isOpen, post]);

  const hasText = hasVisibleText(text);
  const hasMedia = previewItems.length > 0;
  const canSave = !submitting && !yadisk.hasPending && (hasText || hasMedia);
  const canMoveText = hasText && hasMedia;

  const existingOrderChanged = useMemo(() => {
    const originalKept = existingMediaNames.filter((name) => !removedMediaNames.includes(name));
    return (
      keptExistingMediaNames.length === originalKept.length &&
      keptExistingMediaNames.some((name, i) => name !== originalKept[i])
    );
  }, [existingMediaNames, keptExistingMediaNames, removedMediaNames]);

  const handleAttachClick = async () => {
    if (yadisk.albumMode) {
      const ok = await onSinglesConflict();
      if (!ok) return;
      yadisk.reset();
    }
    fileInputRef.current?.click();
  };

  const persistSave = async () => {
    if (!post || !canSave) return;

    const nextContent = text;
    setSubmitting(true);
    setPreviewMenuOpen(false);
    try {
      const hasFileChanges =
        removedMediaNames.length > 0 ||
        mediaFiles.length > 0 ||
        yadisk.albumMode ||
        existingOrderChanged;
      const initialExternal = JSON.stringify(post.external_media || []);
      const nextExternal = JSON.stringify(yadisk.storedMedia);
      const hasExternalChanges = initialExternal !== nextExternal;
      const captionChanged = (post.caption_above !== false) !== captionAbove;

      /** @type {FormData | Record<string, unknown>} */
      let payload;

      if (hasFileChanges || yadisk.albumMode) {
        payload = new FormData();
        payload.append('content', nextContent);
        payload.append('external_media', nextExternal);
        payload.append('caption_above', captionAbove ? 'true' : 'false');
        if (yadisk.albumMode) {
          existingMediaNames.forEach((filename) => payload.append('media-', filename));
        } else if (existingOrderChanged) {
          existingMediaNames.forEach((filename) => payload.append('media-', filename));
          for (const filename of keptExistingMediaNames) {
            const url = getMediaUrl(post, 'posts', filename);
            if (!url) continue;
            const res = await fetch(url);
            const blob = await res.blob();
            payload.append(
              'media',
              new File([blob], filename, { type: blob.type || 'application/octet-stream' })
            );
          }
          mediaFiles.forEach((file) => payload.append('media', file));
        } else {
          removedMediaNames.forEach((filename) => payload.append('media-', filename));
          mediaFiles.forEach((file) => payload.append('media', file));
        }
      } else if (hasExternalChanges || captionChanged) {
        payload = {
          content: nextContent,
          external_media: yadisk.storedMedia,
          caption_above: captionAbove
        };
      } else {
        payload = { content: nextContent, caption_above: captionAbove };
      }

      const updatedPost = await updatePost(post.id, payload);
      onSaved(updatedPost);
    } catch (err) {
      error('Ошибка редактирования публикации:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (previewMenuOpen) {
      setPreviewMenuOpen(false);
      return;
    }
    await persistSave();
  };

  const { handlers: longPressHandlers, ringProps } = useLongPress({
    enabled: canSave && !previewMenuOpen,
    onLongPress: () => setPreviewMenuOpen(true),
    durationMs: 450
  });

  const textBlock = (
    <div className="edit-post-editor">
      <PostRichTextField
        id={textareaId}
        value={text}
        onChange={setText}
        placeholder="Текст публикации…"
        compact={false}
      />
    </div>
  );

  const mediaBlock =
    previewItems.length > 0 ? (
      <div className="edit-post-media-strip-wrap">
        <SortableMediaPreviewGrid
          items={previewItems}
          layout="strip"
          className="edit-post-preview-strip"
          onReorder={(next) => {
            const fileByKey = new Map(
              mediaFiles.map((file) => [`${file.name}-${file.lastModified}`, file])
            );
            setMediaFiles(
              next.map((item) => fileByKey.get(item.key)).filter(Boolean)
            );
            const nextExisting = next
              .filter((item) => String(item.key).startsWith('existing-'))
              .map((item) => String(item.key).slice('existing-'.length));
            setExistingOrder((prev) => {
              const removed = prev.filter((name) => removedMediaNames.includes(name));
              return [...nextExisting, ...removed];
            });
          }}
          onItemClick={openPreviewMedia}
          getAction={(item) => (
            <button
              type="button"
              className="media-remove-btn comment-media-remove-btn"
              onClick={(event) => {
                event.stopPropagation();
                if (String(item.key).startsWith('yadisk-')) {
                  yadisk.removeItem(item.key);
                  return;
                }
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
      </div>
    ) : null;

  const actionsFooter = (
    <div className="modal-actions edit-post-actions">
      <button
        type="button"
        className="edit-post-cancel-btn"
        onClick={onClose}
        disabled={submitting}
      >
        Отмена
      </button>
      <div className="edit-post-actions__primary create-post-form__actions--with-attach">
        <PostAttachButton
          disabled={(remainingMediaSlots === 0 && !yadisk.albumMode) || submitting}
          onClick={handleAttachClick}
        />
        <button
          type="submit"
          form="edit-post-form"
          className="submit-btn-full edit-post-save-btn create-post-form__publish"
          disabled={!canSave}
          {...(canSave ? longPressHandlers : {})}
        >
          {submitting ? 'Сохраняем…' : yadisk.hasPending ? 'Превью…' : 'Сохранить'}
        </button>
        <LongPressRing {...ringProps} />
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={submitting ? undefined : onClose}
        title="Редактировать публикацию"
        className="edit-post-modal"
        showCloseButton={false}
        footer={actionsFooter}
      >
        <form id="edit-post-form" onSubmit={handleSubmit} className="edit-post-form">
          {textBlock}
          {mediaBlock}

          <input
            ref={fileInputRef}
            id={fileInputId}
            name="edit-post-media"
            type="file"
            accept="image/*,video/mp4"
            multiple
            disabled={(remainingMediaSlots === 0 && !yadisk.albumMode) || submitting}
            onChange={(event) => {
              const incoming = readSelectedFiles(event.target.files, remainingMediaSlots);
              setMediaFiles((current) => [...current, ...incoming]);
              event.currentTarget.value = '';
            }}
            className="visually-hidden"
          />
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
        previewItems={previewItems}
        captionAbove={captionAbove}
        canMoveText={canMoveText}
        publishLabel="Сохранить"
        showSendLater={false}
        onToggleCaption={() => setCaptionAbove((v) => !v)}
        onPublishNow={() => void persistSave()}
        onClose={() => setPreviewMenuOpen(false)}
      />
    </>
  );
}

export default EditPostModal;
