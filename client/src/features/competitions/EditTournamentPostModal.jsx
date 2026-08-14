import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { updateTournamentPost } from '../../services/tournamentPosts';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import MediaPreviewGrid from '../feed/MediaPreviewGrid';
import PostAttachButton from '../feed/PostAttachButton';
import PostRichTextField from '../feed/PostRichTextField';
import { useLocalMediaFullscreen } from '../feed/useLocalMediaFullscreen';
import { useYadiskEmbed } from '../feed/useYadiskEmbed';
import { ALBUM_COVER_RADIUS, ALBUM_WINDOW_RADIUS } from '../feed/yadiskAlbumLazy';
import {
  MAX_POST_MEDIA_FILES,
  getMediaUrl,
  isVideoFile,
  isVideoMediaName,
  mediaNames,
  readSelectedFiles
} from '../../lib/media';
import { error } from '../../lib/log';
import { hasVisibleText, toDisplayHtml } from '../feed/postRichText';

/**
 * @param {{
 *   isOpen: boolean,
 *   post: import('../../services/tournamentPosts').TournamentPostRecord | null,
 *   onClose: () => void,
 *   onSaved: (post: import('../../services/tournamentPosts').TournamentPostRecord) => void
 * }} props
 */
function EditTournamentPostModal({ isOpen, post, onClose, onSaved }) {
  const textareaId = useId();
  const fileInputId = useId();
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [text, setText] = useState('');
  const [mediaFiles, setMediaFiles] = useState(/** @type {File[]} */ ([]));
  const [removedMediaNames, setRemovedMediaNames] = useState(/** @type {string[]} */ ([]));
  const [newPreviewItems, setNewPreviewItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { confirm } = useAlertDialog();

  const existingMediaNames = useMemo(() => mediaNames(post?.media), [post?.media]);
  const keptExistingMediaNames = useMemo(
    () => existingMediaNames.filter((filename) => !removedMediaNames.includes(filename)),
    [existingMediaNames, removedMediaNames]
  );
  const existingPreviewItems = useMemo(
    () =>
      post
        ? keptExistingMediaNames.flatMap((filename) => {
          const url = getMediaUrl(post, 'tournament_posts', filename);
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
  } = useLocalMediaFullscreen(previewItems, 'edit-tournament-post', {
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
    setText(toDisplayHtml(post.content || ''));
    setMediaFiles([]);
    setRemovedMediaNames([]);
  }, [isOpen, post]);

  const handleAttachClick = async () => {
    if (yadisk.albumMode) {
      const ok = await onSinglesConflict();
      if (!ok) return;
      yadisk.reset();
    }
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!post || submitting || yadisk.hasPending) return;

    if (!hasVisibleText(text)) return;
    const nextContent = text;

    setSubmitting(true);
    try {
      const hasFileChanges =
        removedMediaNames.length > 0 || mediaFiles.length > 0 || yadisk.albumMode;
      const initialExternal = JSON.stringify(post.external_media || []);
      const nextExternal = JSON.stringify(yadisk.storedMedia);
      const hasExternalChanges = initialExternal !== nextExternal;

      let payload = /** @type {FormData | Record<string, unknown>} */ ({
        content: nextContent,
        external_media: yadisk.storedMedia
      });

      if (hasFileChanges || yadisk.albumMode) {
        payload = new FormData();
        payload.append('content', nextContent);
        payload.append('external_media', nextExternal);
        if (yadisk.albumMode) {
          existingMediaNames.forEach((filename) => payload.append('media-', filename));
        } else {
          removedMediaNames.forEach((filename) => payload.append('media-', filename));
          mediaFiles.forEach((file) => payload.append('media', file));
        }
      } else if (hasExternalChanges) {
        payload = {
          content: nextContent,
          external_media: yadisk.storedMedia
        };
      } else {
        payload = { content: nextContent };
      }

      const updatedPost = await updateTournamentPost(post.id, payload);
      onSaved(updatedPost);
    } catch (err) {
      error('Ошибка редактирования турнирной публикации:', err);
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
          originKeyPrefix="edit-tournament-post"
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

        <input
          ref={fileInputRef}
          id={fileInputId}
          name="edit-tournament-post-media"
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
              className="submit-btn-full edit-post-save-btn create-post-form__publish"
              disabled={submitting || yadisk.hasPending || !hasVisibleText(text)}
            >
              {submitting ? 'Сохраняем…' : yadisk.hasPending ? 'Превью…' : 'Сохранить'}
            </button>
          </div>
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

export default EditTournamentPostModal;
