import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { AttachButtons, MAX_COMMENT_MEDIA_FILES } from './CommentComposeForm';
import PostRichTextField from './PostRichTextField';
import { EMOJI_ATTACH_SWAP_MS } from './emoji/EmojiPicker';
import SortableMediaPreviewGrid from './SortableMediaPreviewGrid';
import FullscreenImageViewer from './FullscreenImageViewer';
import { useLocalMediaFullscreen } from './useLocalMediaFullscreen';
import { findScrollParent, restoreAndKeepCommentEditInView } from './keepCommentEditInView';
import { hasVisibleText, toDisplayHtml } from './postRichText';
import { prepareCommentMediaFile } from './prepareMediaDraft';
import {
  getMediaUrl,
  isVideoFile,
  isVideoMediaName,
  mediaNames,
  readSelectedFiles
} from '../../lib/media';

/**
 * @param {string[]} left
 * @param {string[]} right
 */
function areStringArraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

/**
 * @param {any} comment
 * @param {'comments' | 'tournament_comments'} collection
 */
function buildEditMediaItems(comment, collection) {
  return mediaNames(comment?.media).flatMap((filename) => {
    const url = getMediaUrl(comment, collection, filename);
    if (!url) return [];
    return [{
      key: `existing-${filename}`,
      kind: /** @type {'existing'} */ ('existing'),
      filename,
      file: null,
      url,
      name: filename,
      isVideo: isVideoMediaName(filename),
      status: /** @type {'ready'} */ ('ready')
    }];
  });
}

/**
 * @param {{
 *   comment: any,
 *   collection: 'comments' | 'tournament_comments',
 *   formRef?: React.Ref<HTMLFormElement>,
 *   fieldRef?: React.Ref<{ focus: () => void, clear: () => void }>,
 *   onSave: (payload: {
 *     text: string,
 *     orderedMedia: Array<{
 *       filename?: string,
 *       url?: string,
 *       name?: string,
 *       kind?: 'existing' | 'new',
 *       file?: File | null
 *     }>,
 *     orderChanged: boolean,
 *     mediaChanged: boolean,
 *     originalNames: string[]
 *   }) => void | Promise<void>,
 *   onCancel: () => void
 * }} props
 */
function CommentEditInlineForm({
  comment,
  collection,
  formRef,
  fieldRef,
  onSave,
  onCancel
}) {
  const originalHtml = useMemo(() => toDisplayHtml(comment?.text || ''), [comment]);
  const originalNames = useMemo(() => mediaNames(comment?.media), [comment]);
  const galleryInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const cameraInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const internalFieldRef = useRef(null);
  const resolvedFieldRef = fieldRef || internalFieldRef;
  const galleryInputId = useId();
  const cameraInputId = useId();

  const [text, setText] = useState(originalHtml);
  const [orderedMedia, setOrderedMedia] = useState(() => buildEditMediaItems(comment, collection));
  const scrollTopBeforeFocusRef = React.useRef(/** @type {number | null} */ (null));

  const currentExistingNames = useMemo(
    () =>
      orderedMedia
        .filter((item) => item.kind === 'existing')
        .map((item) => item.filename)
        .filter(Boolean),
    [orderedMedia]
  );
  const hasNewMedia = orderedMedia.some((item) => item.kind === 'new');
  const hasPendingMedia = orderedMedia.some((item) => item.status === 'loading');
  const orderChanged =
    !areStringArraysEqual(currentExistingNames, originalNames.filter((n) => currentExistingNames.includes(n))) ||
    currentExistingNames.length !== originalNames.length ||
    hasNewMedia;
  const mediaChanged = orderChanged || hasNewMedia;
  const textChanged = text !== originalHtml;
  const hasChanges = textChanged || mediaChanged;
  const canSave =
    !hasPendingMedia &&
    hasChanges &&
    (hasVisibleText(text) || orderedMedia.some((item) => item.status === 'ready'));
  const remainingSlots = Math.max(0, MAX_COMMENT_MEDIA_FILES - orderedMedia.length);
  const hasText = hasVisibleText(text);
  const [toolbarAttachVisible, setToolbarAttachVisible] = useState(() => hasText);
  const [fieldAttachVisible, setFieldAttachVisible] = useState(() => !hasText);

  React.useEffect(() => {
    if (hasText) {
      setFieldAttachVisible(false);
      setToolbarAttachVisible(true);
      return undefined;
    }
    setToolbarAttachVisible(false);
    const timer = window.setTimeout(() => setFieldAttachVisible(true), EMOJI_ATTACH_SWAP_MS);
    return () => window.clearTimeout(timer);
  }, [hasText]);

  const attachDisabled = remainingSlots === 0;

  const previewItems = useMemo(
    () =>
      orderedMedia.map((item) => ({
        key: item.key,
        url: item.url,
        name: item.name,
        isVideo: item.isVideo,
        status: item.status || (item.url ? 'ready' : 'loading'),
        progress: item.progress ?? null
      })),
    [orderedMedia]
  );

  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    onCloseStart: handlePreviewCloseStart,
    handleActiveIndexChange: handlePreviewIndexChange
  } = useLocalMediaFullscreen(previewItems, 'comment-edit');

  const openGallery = useCallback(() => {
    const field = /** @type {{ saveSelection?: () => void } | null} */ (resolvedFieldRef.current);
    field?.saveSelection?.();
    galleryInputRef.current?.click();
  }, [resolvedFieldRef]);

  const openCamera = useCallback(() => {
    const field = /** @type {{ saveSelection?: () => void } | null} */ (resolvedFieldRef.current);
    field?.saveSelection?.();
    cameraInputRef.current?.click();
  }, [resolvedFieldRef]);

  const ingestFiles = useCallback(
    async (fileList) => {
      const field = /** @type {{
        saveSelection?: () => void,
        restoreSelection?: () => void,
        focus?: (o?: any) => void
      } | null} */ (resolvedFieldRef.current);
      field?.saveSelection?.();

      const slots = Math.max(0, MAX_COMMENT_MEDIA_FILES - orderedMedia.length);
      const incoming = readSelectedFiles(fileList, slots).filter(
        (file) =>
          !isVideoFile(file) &&
          !file.type.startsWith('video/') &&
          (file.type.startsWith('image/') || /\.gif$/i.test(file.name))
      );
      if (!incoming.length) {
        requestAnimationFrame(() => field?.restoreSelection?.());
        return;
      }

      for (const file of incoming) {
        const key = `new-${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
        setOrderedMedia((cur) => [
          ...cur,
          {
            key,
            kind: /** @type {'new'} */ ('new'),
            filename: undefined,
            file: null,
            url: '',
            name: file.name,
            isVideo: isVideoFile(file),
            status: /** @type {'loading'} */ ('loading'),
            progress: 0
          }
        ]);
        try {
          const prepared = await prepareCommentMediaFile(file, (progress) => {
            setOrderedMedia((cur) =>
              cur.map((item) => (item.key === key ? { ...item, progress } : item))
            );
          });
          setOrderedMedia((cur) =>
            cur.map((item) =>
              item.key === key
                ? {
                    key,
                    kind: 'new',
                    filename: undefined,
                    file: prepared.file,
                    url: prepared.url,
                    name: prepared.name,
                    isVideo: prepared.isVideo,
                    status: 'ready',
                    progress: 100
                  }
                : item
            )
          );
        } catch {
          setOrderedMedia((cur) => cur.filter((item) => item.key !== key));
        }
      }
      requestAnimationFrame(() => {
        field?.focus?.({ restoreSaved: true });
        field?.restoreSelection?.();
      });
    },
    [orderedMedia.length, resolvedFieldRef]
  );

  const removeMedia = useCallback((key) => {
    setOrderedMedia((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target?.kind === 'new' && target.url?.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((item) => item.key !== key);
    });
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    void onSave({
      text,
      orderedMedia: orderedMedia
        .filter((item) => item.status === 'ready')
        .map((item) => ({
          filename: item.filename,
          url: item.url,
          name: item.name,
          kind: item.kind,
          file: item.file
        })),
      orderChanged,
      mediaChanged,
      originalNames
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="comment-edit-inline-form"
      onPointerDownCapture={() => {
        const formEl = /** @type {HTMLFormElement | null} */ (
          formRef && typeof formRef === 'object' && 'current' in formRef ? formRef.current : null
        );
        const sp = findScrollParent(formEl);
        scrollTopBeforeFocusRef.current = sp?.scrollTop ?? null;
      }}
    >
      <label htmlFor={`edit-comment-${comment.id}`} className="visually-hidden">
        Редактирование комментария
      </label>
      <input
        id={galleryInputId}
        ref={galleryInputRef}
        type="file"
        accept="image/*,.gif"
        multiple
        className="visually-hidden"
        tabIndex={-1}
        onChange={(e) => {
          void ingestFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />
      <input
        id={cameraInputId}
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        tabIndex={-1}
        onChange={(e) => {
          void ingestFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />
      <PostRichTextField
        ref={resolvedFieldRef}
        id={`edit-comment-${comment.id}`}
        value={text}
        onChange={setText}
        enableFrame={false}
        compact
        fieldEmojiMode="after-text"
        placeholder="Текст комментария…"
        aria-label="Редактирование комментария"
        toolbarExtra={
          <AttachButtons
            variant="toolbar"
            visible={toolbarAttachVisible}
            disabled={attachDisabled}
            onGallery={openGallery}
            onCamera={openCamera}
          />
        }
        editorEnd={
          <AttachButtons
            variant="field"
            visible={fieldAttachVisible}
            disabled={attachDisabled}
            onGallery={openGallery}
            onCamera={openCamera}
          />
        }
        onFocus={() => {
          const formEl = /** @type {HTMLFormElement | null} */ (
            formRef && typeof formRef === 'object' && 'current' in formRef ? formRef.current : null
          );
          restoreAndKeepCommentEditInView(formEl, scrollTopBeforeFocusRef.current);
        }}
      />
      {previewItems.length > 0 ? (
        <div className="comment-edit-inline-form__media">
          <SortableMediaPreviewGrid
            items={previewItems}
            layout="strip"
            className="comment-edit-media-strip"
            onReorder={(next) => {
              const byKey = new Map(orderedMedia.map((item) => [item.key, item]));
              setOrderedMedia(
                next.map((item) => byKey.get(item.key)).filter(Boolean)
              );
            }}
            onItemClick={(item, index, event) => openPreviewMedia(item, index, event)}
            onRemove={(key) => removeMedia(key)}
          />
        </div>
      ) : null}
      <div className="comment-edit-inline-form__actions">
        <button type="submit" disabled={!canSave}>
          Изменить
        </button>
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
      {previewFullscreen ? (
        <FullscreenImageViewer
          items={previewFullscreen.items}
          initialIndex={previewFullscreen.index}
          originRect={previewFullscreen.originRect}
          originKey={previewFullscreen.originKey}
          onCloseStart={handlePreviewCloseStart}
          onActiveIndexChange={handlePreviewIndexChange}
          onClose={closePreviewFullscreen}
        />
      ) : null}
    </form>
  );
}

export default CommentEditInlineForm;
